import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { Chaojiying, ChaojiyingError, SOFT_ID, SOFT_KEY } from "../src/index.js";

describe("Chaojiying client", () => {
  let mock: MockAdapter;
  let client: Chaojiying;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new Chaojiying({
      username: "my_user",
      password: "my_password",
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test("SOFT_ID and SOFT_KEY constants match expected partner credentials", () => {
    expect(SOFT_ID).toBe("984642");
    expect(SOFT_KEY).toBe("369fe52d5cdbb147892a40ac78f13e60");
  });

  test("throws when username or password is missing", () => {
    expect(() => new Chaojiying({ username: "" })).toThrow(ChaojiyingError);
    expect(() => new Chaojiying({ username: "user", password: "" })).toThrow(
      ChaojiyingError
    );
  });

  test("getScore fetches score balance", async () => {
    let capturedBody = "";
    mock.onPost("/Upload/GetScore.php").reply((config) => {
      capturedBody = config.data;
      return [
        200,
        {
          err_no: 0,
          err_str: "OK",
          tifen: 15420,
          tifen_lock: 0,
        },
      ];
    });

    const res = await client.getScore();
    expect(res.err_no).toBe(0);
    expect(res.tifen).toBe(15420);

    const params = new URLSearchParams(capturedBody);
    expect(params.get("user")).toBe("my_user");
    expect(params.get("pass2")).toBeDefined();
    expect(params.get("pass2")?.length).toBe(32);
  });

  test("recognize sends softid in request payload and decodes buffer", async () => {
    let capturedBody = "";
    mock.onPost("/Upload/Processing.php").reply((config) => {
      capturedBody = config.data;
      return [
        200,
        {
          err_no: 0,
          err_str: "OK",
          pic_id: "9160109360600112681",
          pic_str: "8vka",
          md5: "35d5c7f6f53223fbdc5b72783db0c2c0",
        },
      ];
    });

    const fakeImage = Buffer.from("fake-image-bytes");
    const res = await client.recognize(fakeImage, 1004, { strDebug: "test_debug" });

    expect(res.err_no).toBe(0);
    expect(res.pic_id).toBe("9160109360600112681");
    expect(res.pic_str).toBe("8vka");

    const params = new URLSearchParams(capturedBody);
    expect(params.get("softid")).toBe("984642");
    expect(params.get("user")).toBe("my_user");
    expect(params.get("codetype")).toBe("1004");
    expect(params.get("str_debug")).toBe("test_debug");
    expect(params.get("file_base64")).toBe(fakeImage.toString("base64"));
  });

  test("recognize handles data URI strings", async () => {
    let capturedBody = "";
    mock.onPost("/Upload/Processing.php").reply((config) => {
      capturedBody = config.data;
      return [
        200,
        {
          err_no: 0,
          err_str: "OK",
          pic_id: "123",
          pic_str: "abcd",
        },
      ];
    });

    const rawBase64 = "iVBORw0KGgoAAAANSUhEUg==";
    await client.recognize(`data:image/png;base64,${rawBase64}`, 1902);

    const params = new URLSearchParams(capturedBody);
    expect(params.get("file_base64")).toBe(rawBase64);
    expect(params.get("softid")).toBe("984642");
  });

  test("reportError sends softid and picId", async () => {
    let capturedBody = "";
    mock.onPost("/Upload/ReportError.php").reply((config) => {
      capturedBody = config.data;
      return [
        200,
        {
          err_no: 0,
          err_str: "OK",
        },
      ];
    });

    const res = await client.reportError("9160109360600112681");
    expect(res.err_no).toBe(0);

    const params = new URLSearchParams(capturedBody);
    expect(params.get("softid")).toBe("984642");
    expect(params.get("id")).toBe("9160109360600112681");
    expect(params.get("user")).toBe("my_user");
  });

  test("throws ChaojiyingError when API returns non-zero err_no", async () => {
    mock.onPost("/Upload/GetScore.php").reply(200, {
      err_no: -1001,
      err_str: "用户参数异常",
    });

    await expect(client.getScore()).rejects.toThrow(ChaojiyingError);
    try {
      await client.getScore();
    } catch (err) {
      expect(err).toBeInstanceOf(ChaojiyingError);
      const e = err as ChaojiyingError;
      expect(e.errNo).toBe(-1001);
      expect(e.errStr).toBe("用户参数异常");
    }
  });

  test("handles network failures gracefully", async () => {
    mock.onPost("/Upload/GetScore.php").networkError();

    await expect(client.getScore()).rejects.toThrow(ChaojiyingError);
  });
});
