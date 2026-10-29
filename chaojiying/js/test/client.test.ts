import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  CODE_TYPES,
  Chaojiying,
  ChaojiyingAPIError,
  ChaojiyingError,
  CodeType,
  ColorChannel,
  ERROR_CODES,
  FreeModel,
  ImageTooLargeError,
  InsufficientPointsError,
  MalformedBase64Error,
  MissingCredentialsError,
  NetworkError,
  RateLimitError,
  ResponseIntegrityError,
  SOFT_ID,
  SOFT_KEY,
  TimeoutError,
  clickInstruction,
  colorInstruction,
  computeResponseMd5,
  createApiError,
  describeCodeType,
  describeErrorCode,
  horizontalDistance,
  parsePlates,
  parsePoints,
  parseRectangles,
  parseTextLocations,
  resolveFreeModel,
  resultShape,
  verifyResponseMd5,
} from "../src/index.js";

const OK = {
  err_no: 0,
  err_str: "OK",
  pic_id: "9160109360600112681",
  pic_str: "8vka",
  md5: "35d5c7f6f53223fbdc5b72783db0c2c0",
};

function client(extra: ConstructorParameters<typeof Chaojiying>[0] = {}): Chaojiying {
  return new Chaojiying({
    username: "my_user",
    password: "my_password",
    retries: 0,
    retryDelayMs: 0,
    ...extra,
  });
}

describe("Chaojiying client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  test("SOFT_ID and SOFT_KEY constants match expected partner credentials", () => {
    expect(SOFT_ID).toBe("984642");
    expect(SOFT_KEY).toBe("369fe52d5cdbb147892a40ac78f13e60");
  });

  test("throws when username or password is missing", () => {
    expect(() => new Chaojiying({ username: "" })).toThrow(MissingCredentialsError);
    expect(() => new Chaojiying({ username: "user", password: "" })).toThrow(ChaojiyingError);
    expect(() => new Chaojiying({ username: "user", password: "" })).toThrow(
      "Chaojiying password is required."
    );
  });

  test("reads credentials, access token, and api key from the environment", async () => {
    const prev = {
      user: process.env.CHAOJIYING_USER,
      pass: process.env.CHAOJIYING_PASS,
      token: process.env.CHAOJIYING_ACCESS_TOKEN,
      key: process.env.CHAOJIYING_API_KEY,
    };
    process.env.CHAOJIYING_USER = "env_user";
    process.env.CHAOJIYING_PASS = "e10adc3949ba59abbe56e057f20f883e";
    process.env.CHAOJIYING_ACCESS_TOKEN = "tok-1";
    process.env.CHAOJIYING_API_KEY = "ak-1";
    let captured = "";
    mock.onPost("/Upload/GetScore.php").reply((config) => {
      captured = String(config.data);
      return [200, { err_no: 0, err_str: "OK", tifen: "15", tifen_lock: "2" }];
    });
    try {
      const score = await new Chaojiying({ retries: 0 }).getScore();
      const params = new URLSearchParams(captured);
      expect(params.get("user")).toBe("env_user");
      expect(params.get("pass2")).toBe("e10adc3949ba59abbe56e057f20f883e");
      expect(params.get("access_token")).toBe("tok-1");
      expect(score.tifen).toBe(15);
      expect(score.tifen_lock).toBe(2);
    } finally {
      restoreEnv(prev);
    }
  });

  test("accepts an access token without a password", async () => {
    let captured = "";
    mock.onPost("/Upload/GetScore.php").reply((config) => {
      captured = String(config.data);
      return [200, { err_no: 0, err_str: "OK", tifen: 3 }];
    });
    const score = await new Chaojiying({ accessToken: "only-token", retries: 0 }).getBalance();
    const params = new URLSearchParams(captured);
    expect(params.get("access_token")).toBe("only-token");
    expect(params.get("user")).toBeNull();
    expect(score.tifen_lock).toBe(0);
  });

  test("getScore fetches score balance", async () => {
    let captured = "";
    mock.onPost("/Upload/GetScore.php").reply((config) => {
      captured = String(config.data);
      expect(config.baseURL).toBe("https://upload.example");
      const headerBag = config.headers as { get?: (name: string) => string };
      expect(headerBag.get?.("User-Agent") || "test-agent").toContain("test-agent");
      return [200, { err_no: 0, err_str: "OK", tifen: 15420, tifen_lock: 0 }];
    });

    const api = client({
      baseURL: "https://upload.example/",
      userAgent: "test-agent",
      timeoutMs: 5000,
      proxy: "http://user:p%40ss@127.0.0.1:8888",
    });
    const res = await api.getScore();
    expect(res.err_no).toBe(0);
    expect(res.tifen).toBe(15420);
    const params = new URLSearchParams(captured);
    expect(params.get("user")).toBe("my_user");
    expect(params.get("pass2")).toHaveLength(32);
    expect(params.get("softid")).toBeNull();
    const proxy = (api as unknown as { http: { defaults: { proxy: { host: string; auth: { username: string; password: string } } } } }).http.defaults.proxy;
    expect(proxy.host).toBe("127.0.0.1");
    expect(proxy.auth.username).toBe("user");
    expect(proxy.auth.password).toBe("p@ss");
  });

  test("accepts a proxy object and rejects a bad proxy url", () => {
    const api = client({ proxy: { host: "10.0.0.2", port: 3128, protocol: "http" } });
    const proxy = (api as unknown as { http: { defaults: { proxy: { host: string; port: number } } } }).http.defaults.proxy;
    expect(proxy.host).toBe("10.0.0.2");
    expect(proxy.port).toBe(3128);
    expect(() => client({ proxy: "not a url" })).toThrow(ChaojiyingError);
    const httpsProxy = client({ proxy: "https://secure.example" });
    const httpProxy = client({ proxy: "http://open.example" });
    const httpsConfig = (httpsProxy as unknown as { http: { defaults: { proxy: { port: number; protocol: string } } } }).http.defaults.proxy;
    const httpConfig = (httpProxy as unknown as { http: { defaults: { proxy: { port: number } } } }).http.defaults.proxy;
    expect(httpsConfig.protocol).toBe("https");
    expect(httpsConfig.port).toBe(443);
    expect(httpConfig.port).toBe(80);
  });

  test("recognize sends softid, len_min, time_add, and decodes a buffer", async () => {
    let captured = "";
    mock.onPost("/Upload/Processing.php").reply((config) => {
      captured = String(config.data);
      return [200, OK];
    });

    const fakeImage = Buffer.from("fake-image-bytes");
    const res = await client().recognize(fakeImage, 1004, {
      strDebug: "test_debug",
      lenMin: 4,
      timeAdd: 10,
    });

    expect(res.err_no).toBe(0);
    expect(res.pic_id).toBe(OK.pic_id);
    expect(res.pic_str).toBe("8vka");
    expect(res.md5).toBe(OK.md5);
    const params = new URLSearchParams(captured);
    expect(params.get("softid")).toBe(SOFT_ID);
    expect(params.get("user")).toBe("my_user");
    expect(params.get("codetype")).toBe("1004");
    expect(params.get("str_debug")).toBe("test_debug");
    expect(params.get("len_min")).toBe("4");
    expect(params.get("time_add")).toBe("10");
    expect(params.get("file_base64")).toBe(fakeImage.toString("base64"));
  });

  test("recognize handles data URIs, whitespace, url-safe base64, and typed arrays", async () => {
    const bodies: string[] = [];
    mock.onPost("/Upload/Processing.php").reply((config) => {
      bodies.push(String(config.data));
      return [200, { ...OK, pic_str: "abcd", pic_id: 99 }];
    });

    const rawBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    const api = client();
    const fromUri = await api.recognize(`data:image/png;base64,${rawBase64}`, CodeType.ALNUM_4_TO_6);
    expect(new URLSearchParams(bodies[0]).get("file_base64")).toBe(rawBase64);
    expect(fromUri.pic_id).toBe("99");

    const spaced = rawBase64.slice(0, 8) + "\n" + rawBase64.slice(8);
    await api.postPicBase64(spaced, "1902");
    expect(new URLSearchParams(bodies[1]).get("file_base64")).toBe(rawBase64);

    const bytes = Buffer.from(rawBase64, "base64");
    await api.recognize(new Uint8Array(bytes), 1004);
    await api.recognize(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 1004);
    expect(new URLSearchParams(bodies[2]).get("file_base64")).toBe(rawBase64);
  });

  test("recognize can send JSON and multipart userfile uploads", async () => {
    const seen: Array<{ data: unknown; type: unknown }> = [];
    mock.onPost("/Upload/Processing.php").reply((config) => {
      const headers = config.headers as { get?: (name: string) => unknown; "Content-Type"?: unknown };
      seen.push({
        data: config.data,
        type: headers.get?.("Content-Type") ?? headers["Content-Type"],
      });
      return [200, { err_no: "0", err_str: "OK", pic_id: "1", pic_str: "12,34|56,78" }];
    });

    const image = Buffer.from("img");
    const jsonResult = await client({ softId: "cust", softKey: "key" }).recognize(image, 9004, {
      bodyFormat: "json",
      lenMin: 0,
    });
    expect(jsonResult.points).toEqual([
      { x: 12, y: 34 },
      { x: 56, y: 78 },
    ]);
    expect(JSON.parse(String(seen[0].data)).codetype).toBe("9004");
    expect(JSON.parse(String(seen[0].data)).softid).toBe("cust");
    expect(String(seen[0].type)).toContain("application/json");

    const multi = await client().postPic(image, CodeType.BLOCKS, { filename: "gap.png" });
    expect(multi.pic_str).toBe("12,34|56,78");
    expect(multi.rectangles).toBeUndefined();
    expect(seen[1].data).toBeInstanceOf(FormData);
    const form = seen[1].data as FormData;
    expect(form.get("codetype")).toBe(String(CodeType.BLOCKS));
    expect(form.get("softid")).toBe(SOFT_ID);
    expect(form.get("file_base64")).toBeNull();
    expect(form.get("userfile")).toBeTruthy();
  });

  test("parses text locations and plates and keeps raw text when parsing fails", async () => {
    mock.onPost("/Upload/Processing.php").replyOnce(200, {
      err_no: 0,
      err_str: "OK",
      pic_id: "p",
      pic_str: "\\u67e5,10,20|找,3,4",
    });
    mock.onPost("/Upload/Processing.php").replyOnce(200, {
      err_no: 0,
      err_str: "OK",
      pic_id: "p2",
      pic_str: "冀AB65883,0.9995,green,482,305,579,339",
    });
    mock.onPost("/Upload/Processing.php").replyOnce(200, {
      err_no: 0,
      err_str: "OK",
      pic_id: "p3",
      pic_str: "not-coords",
    });
    const api = client();
    const text = await api.recognize(Buffer.from("a"), CodeType.LOCATE_ALL_TEXT);
    expect(text.text_locations).toEqual([
      { text: "查", x: 10, y: 20 },
      { text: "找", x: 3, y: 4 },
    ]);
    const plates = await api.recognize(Buffer.from("a"), CodeType.LICENSE_PLATE);
    expect(plates.plates?.[0].number).toBe("冀AB65883");
    expect(plates.plates?.[0].color).toBe("green");
    const broken = await api.recognize(Buffer.from("a"), CodeType.CLICK_1_TO_4);
    expect(broken.pic_str).toBe("not-coords");
    expect(broken.points).toBeUndefined();
  });

  test("verifyMd5 accepts a matching checksum and rejects a mismatch or a missing key", async () => {
    const image = Buffer.from("a");
    const pic = { err_no: 0, err_str: "OK", pic_id: "pic", pic_str: "abcd" };
    const md5 = computeResponseMd5(SOFT_ID, SOFT_KEY, pic.pic_id, pic.pic_str);
    mock.onPost("/Upload/Processing.php").replyOnce(200, { ...pic, md5 });
    mock.onPost("/Upload/Processing.php").replyOnce(200, { ...pic, md5: "deadbeef" });
    mock.onPost("/Upload/Processing.php").replyOnce(200, pic);
    mock.onPost("/Upload/Processing.php").replyOnce(200, { ...pic, md5 });

    const api = client();
    const ok = await api.recognize(image, 1004, { verifyMd5: true });
    expect(ok.pic_str).toBe("abcd");
    await expect(api.recognize(image, 1004, { verifyMd5: true })).rejects.toBeInstanceOf(ResponseIntegrityError);
    await expect(api.recognize(image, 1004, { verifyMd5: true })).rejects.toThrow(/did not include an md5/);
    const custom = client({ softId: "other" });
    await expect(custom.recognize(image, 1004, { verifyMd5: true })).rejects.toThrow(/softKey is required/);
    expect(verifyResponseMd5({ pic_id: "pic", pic_str: "abcd" }, SOFT_ID, SOFT_KEY)).toBe(false);
  });

  test("recognizeFile reads from disk and rejects empty, huge, and bad images", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "cjy-"));
    const file = path.join(dir, "cap.bin");
    await writeFile(file, Buffer.from("file-bytes"));
    mock.onPost("/Upload/Processing.php").reply(200, OK);
    const res = await client().recognizeFile(file, 1004);
    expect(res.pic_str).toBe("8vka");

    const api = client();
    await expect(api.recognize(Buffer.alloc(0), 1004)).rejects.toBeInstanceOf(ChaojiyingError);
    await expect(api.recognize("", 1004)).rejects.toBeInstanceOf(ChaojiyingError);
    await expect(api.recognize("!!!!", 1004)).rejects.toBeInstanceOf(MalformedBase64Error);
    await expect(api.recognize(Buffer.alloc(MAX_PLUS), 1004)).rejects.toBeInstanceOf(ImageTooLargeError);
    await expect(api.recognize("", "")).rejects.toThrow(/codetype is required/);
    await expect(api.recognize(Buffer.from("a"), Number.NaN)).rejects.toThrow(/codetype is required/);
    await expect(api.reportError("")).rejects.toThrow(/pic_id is required/);
  });

  test("reportError sends softid and picId", async () => {
    let captured = "";
    mock.onPost("/Upload/ReportError.php").reply((config) => {
      captured = String(config.data);
      return [200, { err_no: 0, err_str: "OK" }];
    });
    const res = await client().report("9160109360600112681");
    expect(res.err_no).toBe(0);
    const params = new URLSearchParams(captured);
    expect(params.get("softid")).toBe(SOFT_ID);
    expect(params.get("id")).toBe("9160109360600112681");
    expect(params.get("user")).toBe("my_user");
  });

  test("maps every documented API error and does not retry paid failures", async () => {
    for (const info of ERROR_CODES) {
      const err = createApiError(info.errNo, undefined, { err_no: info.errNo });
      expect(err).toBeInstanceOf(info.ctor);
      expect(err.errNo).toBe(info.errNo);
      expect(err.errStr).toBe(info.errStr);
      expect(describeErrorCode(info.errNo)?.remedy).toBe(info.remedy);
    }
    expect(createApiError(-9999, "nope")).toBeInstanceOf(ChaojiyingAPIError);
    expect(describeErrorCode(0)).toBeUndefined();

    let calls = 0;
    mock.onPost("/Upload/GetScore.php").reply(() => {
      calls += 1;
      return [200, { err_no: -1005, err_str: "无可用题分" }];
    });
    const api = client({ retries: 3 });
    await expect(api.getScore()).rejects.toBeInstanceOf(InsufficientPointsError);
    expect(calls).toBe(1);
  });

  test("retries rate limits and connection failures, but not paid timeouts", async () => {
    let scoreCalls = 0;
    mock.onPost("/Upload/GetScore.php").reply(() => {
      scoreCalls += 1;
      if (scoreCalls === 1) return [200, { err_no: -429, err_str: "请求过于频繁" }];
      return [200, { err_no: 0, err_str: "OK", tifen: 9, tifen_lock: 1 }];
    });
    const score = await client({ retries: 2, retryDelayMs: 1 }).getScore();
    expect(score.tifen).toBe(9);
    expect(scoreCalls).toBe(2);

    let procCalls = 0;
    mock.onPost("/Upload/Processing.php").reply(() => {
      procCalls += 1;
      return [500, "upstream"];
    });
    await expect(client({ retries: 2 }).recognize(Buffer.from("a"), 1004)).rejects.toBeInstanceOf(NetworkError);
    expect(procCalls).toBe(1);

    mock.reset();
    let timed = 0;
    mock.onPost("/Upload/Processing.php").reply(() => {
      timed += 1;
      return [408, ""];
    });
    await expect(client({ retries: 2 }).recognize(Buffer.from("a"), 1004)).rejects.toBeInstanceOf(NetworkError);
    expect(timed).toBe(1);

    mock.reset();
    let safe = 0;
    mock.onPost("/Upload/GetScore.php").reply(() => {
      safe += 1;
      if (safe < 2) return [503, "busy"];
      return [200, { err_no: 0, err_str: "OK", tifen: 1, tifen_lock: 0 }];
    });
    await expect(client({ retries: 2 }).getScore()).resolves.toMatchObject({ tifen: 1 });
    expect(safe).toBe(2);
  });

  test("retries a dropped connection and surfaces axios timeouts", async () => {
    let calls = 0;
    mock.onPost("/Upload/Processing.php").reply(() => {
      calls += 1;
      if (calls === 1) throw new axios.AxiosError("socket hang up", "ECONNRESET");
      return [200, OK];
    });
    const res = await client({ retries: 1 }).recognize(Buffer.from("a"), 1004);
    expect(res.pic_str).toBe("8vka");
    expect(calls).toBe(2);

    mock.reset();
    mock.onPost("/Upload/Processing.php").reply(() => {
      throw new axios.AxiosError("timeout of 1ms exceeded", "ECONNABORTED");
    });
    await expect(client({ retries: 3 }).recognize(Buffer.from("a"), 1004)).rejects.toBeInstanceOf(TimeoutError);

    mock.reset();
    let scoreCalls = 0;
    mock.onPost("/Upload/GetScore.php").reply(() => {
      scoreCalls += 1;
      if (scoreCalls === 1) throw new axios.AxiosError("timeout", "ETIMEDOUT");
      return [200, { err_no: 0, err_str: "OK", tifen: 4, tifen_lock: 0 }];
    });
    await expect(client({ retries: 1 }).getScore()).resolves.toMatchObject({ tifen: 4 });
  });

  test("handles network failures, non-json bodies, and http 429 without a body", async () => {
    mock.onPost("/Upload/GetScore.php").networkError();
    await expect(client().getScore()).rejects.toBeInstanceOf(NetworkError);

    mock.reset();
    mock.onPost("/Upload/GetScore.php").reply(200, "nope", { "content-type": "text/plain" });
    await expect(client().getScore()).rejects.toThrow(/non-JSON/);

    mock.reset();
    mock.onPost("/Upload/GetScore.php").reply(200, [1, 2, 3]);
    await expect(client().getScore()).rejects.toThrow(/non-JSON/);

    mock.reset();
    mock.onPost("/Upload/GetScore.php").reply(200, { err_str: "OK" });
    await expect(client().getScore()).rejects.toThrow(/err_no/);

    mock.reset();
    mock.onPost("/Upload/GetScore.php").reply(429, "slow down");
    await expect(client({ retries: 0 }).getScore()).rejects.toBeInstanceOf(RateLimitError);

    mock.reset();
    mock.onPost("/Upload/GetScore.php").reply(400, { oops: true });
    await expect(client().getScore()).rejects.toBeInstanceOf(NetworkError);

    mock.reset();
    mock.onPost("/Upload/GetScore.php").reply(() => {
      throw new Error("adapter exploded");
    });
    await expect(client().getScore()).rejects.toThrow(/adapter exploded|Network request failed|Request failed/);

    mock.reset();
    mock.onPost("/Upload/GetScore.php").reply(200, { err_no: 0, err_str: 7, tifen: { bad: true } });
    await expect(client().getScore()).rejects.toThrow(/Expected a number/);

    mock.reset();
    mock.onPost("/Upload/GetScore.php").reply(200, { err_no: 0, err_str: false, tifen: 1, tifen_lock: 0 });
    await expect(client().getScore()).resolves.toMatchObject({ err_str: "false", tifen: 1 });

    mock.reset();
    mock.onPost("/Upload/Processing.php").reply(200, { err_no: 0, pic_str: 12, pic_id: null });
    const odd = await client().recognize(Buffer.from("a"), 6001);
    expect(odd.pic_str).toBe("12");
    expect(odd.pic_id).toBe("");
    expect(odd.err_str).toBe("");
  });

  test("free OCR posts to the v2 host and parses blocks", async () => {
    const seen: string[] = [];
    mock.onPost(/\/ocr\/v2\/\d+/).reply((config) => {
      seen.push(`${config.baseURL}${config.url}?${new URLSearchParams(config.params).toString()}`);
      const model = String(config.url);
      if (model.endsWith("/9")) {
        return [200, { err_no: 0, err_str: "OK", pic_id: "f", pic_str: "1,2,3,4|5,6,7,8" }];
      }
      return [200, { err_no: 0, err_str: "OK", pic_id: "f", pic_str: "42" }];
    });

    const api = client({ apiKey: "key-9", freeBaseURL: "https://free.example/" });
    const text = await api.recognizeFree(Buffer.from("a"), FreeModel.TEXT);
    expect(text.pic_str).toBe("42");
    expect(seen[0]).toContain("https://free.example/ocr/v2/8");
    expect(seen[0]).toContain("ak=key-9");

    const calc = await api.recognizeFree("aGVsbG8=", "calc");
    expect(calc.pic_str).toBe("42");
    const blocks = await api.recognizeFree(Buffer.from("abcd"), "blocks", { upload: "multipart" });
    expect(blocks.rectangles).toEqual([
      { x1: 1, y1: 2, x2: 3, y2: 4 },
      { x1: 5, y1: 6, x2: 7, y2: 8 },
    ]);

    await expect(client().recognizeFree(Buffer.from("a"), 8)).rejects.toBeInstanceOf(MissingCredentialsError);
    const keyOnly = new Chaojiying({ apiKey: "only-key", retries: 0 });
    const fromKey = await keyOnly.recognizeFree(Buffer.from("b"), "ocr");
    expect(fromKey.pic_str).toBe("42");
    await expect(api.recognizeFree(Buffer.from("a"), "nope")).rejects.toThrow(/Unknown free OCR model/);
    await expect(api.recognizeFree(Buffer.alloc(2 * 1024 * 1024 + 1), 8)).rejects.toBeInstanceOf(ImageTooLargeError);
  });
});

const MAX_PLUS = 1024 * 1024 + 1;

describe("parsers and catalog", () => {
  test("covers every published codetype and result shape", () => {
    expect(CODE_TYPES).toHaveLength(50);
    expect(describeCodeType(1902)?.name).toBe("ALNUM_4_TO_6");
    expect(describeCodeType("8601")?.shape).toBe("plates");
    expect(describeCodeType(1)).toBeUndefined();
    expect(resultShape(9900)).toBe("rectangles");
    expect(resultShape(9800)).toBe("text-locations");
    expect(resultShape(9602)).toBe("points");
    expect(resultShape(12345)).toBe("text");
    expect(new Set(CODE_TYPES.map((info) => info.id)).size).toBe(CODE_TYPES.length);
  });

  test("parses coordinates, rectangles, text, and plates", () => {
    expect(parsePoints("")).toEqual([]);
    expect(parsePoints(" 1,2 | 3,4 ")).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
    expect(() => parsePoints("1,2,3")).toThrow(ChaojiyingError);
    expect(() => parsePoints("a,b")).toThrow(/Invalid x/);
    expect(parseRectangles("0,1,2,3")).toEqual([{ x1: 0, y1: 1, x2: 2, y2: 3 }]);
    expect(() => parseRectangles("0,1")).toThrow(/rectangle/);
    expect(() => parseRectangles("0,1,x,3")).toThrow(/Invalid x2/);
    expect(parseTextLocations("ab,1.5,2")).toEqual([{ text: "ab", x: 1.5, y: 2 }]);
    expect(() => parseTextLocations("nope")).toThrow(/text location/);
    expect(() => parseTextLocations("ab,no,2")).toThrow(/text location/);
    const plate = parsePlates("京A,1,0.5,blue,1,2,3,4")[0];
    expect(plate.number).toBe("京A,1");
    expect(plate.confidence).toBe(0.5);
    expect(() => parsePlates("only,three,parts")).toThrow(/plate/);
    expect(() => parsePlates("n,nope,blue,1,2,3,4")).toThrow(/confidence/);
  });

  test("builds color and click instructions and checks md5", () => {
    expect(colorInstruction(ColorChannel.RED)).toBe("{8f:0,100,255/8f}");
    expect(colorInstruction("green", 10, 200)).toBe("{8f:1,10,200/8f}");
    expect(colorInstruction("蓝")).toBe("{8f:2,100,255/8f}");
    expect(() => colorInstruction(9)).toThrow(/0 to 5/);
    expect(() => colorInstruction("purple")).toThrow(/Unknown color/);
    expect(() => colorInstruction(0, 300)).toThrow(/tolerance/);
    expect(() => colorInstruction(0, 1, -1)).toThrow(/background/);
    expect(clickInstruction(["查", "找"])).toBe("{8a:查,找/8a}");
    expect(() => clickInstruction([])).toThrow(/at least one/);
    expect(() => clickInstruction(["a,b"])).toThrow(/cannot be empty/);
    expect(() => clickInstruction([""])).toThrow(/cannot be empty/);
    expect(horizontalDistance({ x: 10, y: 1 }, { x: 40, y: 9 })).toBe(30);

    const digest = createHash("md5").update(`${SOFT_ID}${SOFT_KEY}picABCD`, "utf8").digest("hex");
    expect(computeResponseMd5(SOFT_ID, SOFT_KEY, "pic", "ABCD")).toBe(digest);
    expect(verifyResponseMd5({ pic_id: "pic", pic_str: "ABCD", md5: digest.toUpperCase() }, SOFT_ID, SOFT_KEY)).toBe(true);
    expect(new ChaojiyingError("plain").errNo).toBeUndefined();
    expect(new NetworkError("down").connectFailure).toBe(false);
    expect(new NetworkError("down").status).toBeUndefined();
    expect(resolveFreeModel("OCR")).toBe(8);
    expect(resolveFreeModel(9)).toBe(9);
    expect(() => resolveFreeModel("slide")).toThrow(/Unknown free OCR model/);
  });
});

function restoreEnv(prev: { user?: string; pass?: string; token?: string; key?: string }): void {
  setOrDelete("CHAOJIYING_USER", prev.user);
  setOrDelete("CHAOJIYING_PASS", prev.pass);
  setOrDelete("CHAOJIYING_ACCESS_TOKEN", prev.token);
  setOrDelete("CHAOJIYING_API_KEY", prev.key);
}

function setOrDelete(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
