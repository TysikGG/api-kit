import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { CLICK, DEFAULT_SOFTGURU, TEXT_INSTRUCTIONS, VERNET } from '../src/constants.js';
import {
  CapGuruError,
  ERROR_CODE_DESCRIPTIONS,
  NoSlotAvailableError,
  ZeroBalanceError,
  createCapGuruError,
} from '../src/errors.js';
import { CapGuru, CapGuruClient } from '../src/index.js';
import { parseClickAnswer, parseGeeTest, readSolutionToken, scaleSliderOffset, sliderOffset } from '../src/parse.js';

function ready(id = 'task-1', answer: unknown = 'ok'): void {
  // registered by each test via the shared mock
  void id;
  void answer;
}

describe('parse helpers', () => {
  it('parses coordinates, grids, widths, and plain tokens', () => {
    expect(parseClickAnswer('OK|coordinate:x=44,y=32')).toEqual({
      raw: 'coordinate:x=44,y=32',
      points: [{ x: 44, y: 32 }],
    });
    expect(parseClickAnswer('coordinates:x=143,y=53,w=42')).toEqual({
      raw: 'coordinates:x=143,y=53,w=42',
      points: [{ x: 143, y: 53, w: 42 }],
    });
    expect(parseClickAnswer('coordinates:x=99,y=196;x=197,y=148;x=144,y=47').points).toHaveLength(3);
    expect(parseClickAnswer('x=10,y=12')).toEqual({
      raw: 'x=10,y=12',
      points: [{ x: 10, y: 12 }],
    });
    expect(parseClickAnswer('1,2,6,9')).toEqual({ raw: '1,2,6,9', cells: [1, 2, 6, 9] });
    expect(parseClickAnswer('coordinates:x=1,y=2;')).toEqual({
      raw: 'coordinates:x=1,y=2;',
      points: [{ x: 1, y: 2 }],
    });
    expect(parseClickAnswer('coordinates:nope')).toEqual({ raw: 'coordinates:nope' });
    expect(parseClickAnswer('token-value')).toEqual({ raw: 'token-value' });
    expect(sliderOffset(parseClickAnswer('coordinates:x=205,y=0'))).toBe(205);
    expect(sliderOffset(parseClickAnswer('nope'))).toBeNull();
  });

  it('scales slider offsets with the documented formulas', () => {
    expect(scaleSliderOffset(143, { imageWidth: 300, windowWidth: 260 })).toBeCloseTo(123.933, 2);
    expect(scaleSliderOffset(205, { windowWidth: 300 })).toBeCloseTo((205 / 271) * 300, 5);
    expect(scaleSliderOffset(10, { windowWidth: 20, fieldWidth: 0, imageWidth: 0 })).toBe(10);
  });

  it('parses geetest JSON, aliases, and plain tokens', () => {
    expect(parseGeeTest(JSON.stringify({ challenge: 'c', validate: 'v', seccode: 's' }))).toEqual({
      challenge: 'c',
      validate: 'v',
      seccode: 's',
    });
    expect(
      parseGeeTest(JSON.stringify({ geetest_challenge: 'c', geetest_validate: 'v', geetest_seccode: 's' })),
    ).toEqual({ challenge: 'c', validate: 'v', seccode: 's' });
    expect(parseGeeTest('raw-token')).toEqual({
      challenge: '',
      validate: 'raw-token',
      seccode: 'raw-token|jordan',
    });
    expect(parseGeeTest('[]')).toEqual({ challenge: '', validate: '[]', seccode: '[]|jordan' });
    expect(parseGeeTest('{}')).toEqual({ challenge: '', validate: '{}', seccode: '' });
    expect(parseGeeTest('{')).toEqual({ challenge: '', validate: '{', seccode: '{|jordan' });
    expect(readSolutionToken({ gRecaptchaResponse: 'g' })).toBe('g');
    expect(readSolutionToken({ token: 't' })).toBe('t');
    expect(readSolutionToken({ text: 'tx' })).toBe('tx');
    expect(readSolutionToken('plain')).toBe('plain');
    expect(readSolutionToken({ other: 1 })).toBe(JSON.stringify({ other: 1 }));
    expect(readSolutionToken({ request: 'from-request' })).toBe('from-request');
    expect(readSolutionToken(null)).toBe('null');
  });

  it('builds a subclass for every documented code', () => {
    for (const code of Object.keys(ERROR_CODE_DESCRIPTIONS)) {
      const err = createCapGuruError(`CapGuru error: ${code}`, code, { status: 0 });
      expect(err).toBeInstanceOf(CapGuruError);
      expect(err.code).toBe(code);
      expect(err.description).toBe(ERROR_CODE_DESCRIPTIONS[code]);
      expect(err.name.length).toBeGreaterThan(0);
    }
    const unknown = createCapGuruError('CapGuru error: ERROR_CUSTOM', 'ERROR_CUSTOM');
    expect(unknown.name).toBe('CapGuruError');
    expect(unknown.description).toBeUndefined();
  });
});

describe('CapGuruClient', () => {
  let mock: MockAdapter;
  let client: CapGuruClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new CapGuruClient({
      apiKey: 'test_api_key',
      defaultPollingIntervalMs: 0,
      defaultPollingTimeoutMs: 1000,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  function script(answer: unknown = 'solved', id = 'task-1'): void {
    mock.onPost('/in.php').reply(200, { status: 1, request: id });
    mock.onGet('/res.php').reply(200, { status: 1, request: answer });
  }

  it('requires an API key and accepts a string shorthand', () => {
    expect(() => new CapGuruClient({ apiKey: '' })).toThrow(CapGuruError);
    expect(new CapGuru('key')).toBeInstanceOf(CapGuruClient);
    const created = jest.spyOn(axios, 'create');
    new CapGuruClient({
      apiKey: 'k',
      baseUrl: 'https://api2.cap.guru/',
      timeout: 1234,
      headers: { 'X-Test': '1' },
      maxRetries: -1,
    });
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api2.cap.guru',
        timeout: 1234,
        headers: { 'X-Test': '1' },
      }),
    );
    created.mockRestore();
  });

  it('sends softguru on createTask and parses plain-text ids', async () => {
    mock.onPost('/in.php').reply((config) => {
      expect(config.params?.softguru).toBe(DEFAULT_SOFTGURU);
      expect(config.params?.softguru).toBe(164125);
      expect(config.params?.key).toBe('test_api_key');
      expect(config.params?.json).toBe(1);
      expect(config.params?.softguru).toBe(164125);
      return [200, 'OK|98765'];
    });
    await expect(client.createTask({ method: 'base64', body: 'abc', softguru: 1, json: 0 })).resolves.toBe(
      '98765',
    );
  });

  it('reads balances, including a numeric zero, and rejects garbage', async () => {
    mock.onGet('/res.php').replyOnce(200, { status: 1, request: '150.00' });
    await expect(client.getBalance()).resolves.toBe(150);
    mock.onGet('/res.php').replyOnce(200, { status: 1, request: 0 });
    await expect(client.balance()).resolves.toBe(0);
    mock.onGet('/res.php').replyOnce(200, '45.5');
    await expect(client.getBalance()).resolves.toBe(45.5);
    mock.onGet('/res.php').replyOnce(200, 12);
    await expect(client.getBalance()).resolves.toBe(12);
    mock.onGet('/res.php').replyOnce(200, 'OK');
    await expect(client.getBalance()).rejects.toMatchObject({ code: 'PARSE_ERROR' });
    mock.onGet('/res.php').replyOnce(200, 'notpic');
    await expect(client.getBalance()).rejects.toMatchObject({ code: 'notpic' });
    mock.onGet('/res.php').replyOnce(200, { status: 1, request: 'nope' });
    await expect(client.getBalance()).rejects.toMatchObject({ code: 'PARSE_ERROR' });
    mock.onGet('/res.php').replyOnce(200, { status: 0, request: 'ERROR_WRONG_USER_KEY' });
    await expect(client.getBalance()).rejects.toThrow(CapGuruError);
    mock.onGet('/res.php').replyOnce(200, { status: '0', request: 'ERROR_ZERO_BALANCE' });
    await expect(client.getBalance()).rejects.toBeInstanceOf(ZeroBalanceError);
  });

  it('solves an image with every optional field and a second polling argument', async () => {
    mock.onPost('/in.php').reply((config) => {
      expect(config.params).toMatchObject({
        method: 'base64',
        body: 'img',
        phrase: 1,
        regsense: 1,
        numeric: 1,
        calc: 1,
        min_len: 2,
        max_len: 6,
        language: 2,
        textinstructions: 'type it',
        vernet: VERNET.MICROSOFT,
        header_acao: 1,
      });
      return [200, { status: 1, request: 'img-id' }];
    });
    mock.onGet('/res.php').reply(200, { status: '1', request: 'TEXT' });
    const seen: number[] = [];
    const text = await client.solveImage(
      {
        body: 'img',
        phrase: 1,
        regsense: 1,
        numeric: 1,
        calc: 1,
        minLen: 2,
        maxLen: 6,
        language: 2,
        textinstructions: 'type it',
        vernet: VERNET.MICROSOFT,
        extra: { header_acao: 1, body: 'ignored' },
        onNotReady: () => seen.push(1),
      },
      { timeoutMs: 500 },
    );
    expect(text).toBe('TEXT');
    expect(seen).toEqual([]);
  });

  it('solves an image from a string and from a file upload', async () => {
    script('from-string');
    await expect(client.solveImage('abc')).resolves.toBe('from-string');

    mock.reset();
    mock.onPost('/in.php').reply((config) => {
      const form = config.data as FormData;
      expect(form.get('softguru')).toBe('164125');
      expect(form.get('method')).toBe('post');
      expect(form.get('vernet')).toBe(String(VERNET.YANDEX));
      expect(form.get('file')).toBeTruthy();
      return [200, { status: 1, request: 'file-id' }];
    });
    mock.onGet('/res.php').reply(200, { status: 1, request: 'FILE' });
    const text = await client.solveImageFile(Buffer.from('png'), { vernet: VERNET.YANDEX, filename: 'captcha.png' });
    expect(text).toBe('FILE');

    mock.reset();
    mock.onPost('/in.php').replyOnce((config) => {
      const form = config.data as FormData;
      expect(form.get('file')).toBeTruthy();
      expect(form.get('filename') ?? form.get('file')).toBeTruthy();
      return [200, { status: 1, request: 'blob-id' }];
    });
    mock.onGet('/res.php').replyOnce(200, { status: 1, request: 'BLOB' });
    await expect(client.solveImageFile(new Blob(['x']))).resolves.toBe('BLOB');
    mock.onPost('/in.php').replyOnce((config) => {
      const form = config.data as FormData;
      expect(form.get('empty')).toBeNull();
      expect(form.get('upload')).toBeTruthy();
      return [200, { status: 1, request: 'upload-id' }];
    });
    await expect(
      client.createTaskMultipart({ method: 'post', empty: null }, Buffer.from('z'), 'z.png', 'upload'),
    ).resolves.toBe('upload-id');
    mock.onPost('/in.php').networkError();
    await expect(client.createTaskMultipart({ method: 'post' }, Buffer.from('z'))).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('solves text, turnstile, hcaptcha, and funcaptcha with transport options', async () => {
    mock.onPost('/in.php').reply((config) => {
      return [200, { status: 1, request: `id-${config.params?.method ?? 'text'}` }];
    });
    mock.onGet('/res.php').reply((config) => {
      return [200, { status: 1, request: `ans-${config.params?.id}` }];
    });

    await expect(client.solveText('What day?', { language: 1, extra: { lang: 'en' } })).resolves.toBe('ans-id-text');
    await expect(
      client.solveTurnstile({
        sitekey: 'sk',
        pageurl: 'https://example.com',
        action: 'login',
        data: 'cdata',
        cookies: 'a=b',
        userAgent: 'UA',
        proxy: 'user:pass@1.2.3.4:8080',
        proxyType: 'HTTP',
      }),
    ).resolves.toBe('ans-id-turnstile');
    await expect(
      client.solveHCaptcha({ sitekey: 'sk', pageurl: 'https://example.com', invisible: 1, data: 'rq' }),
    ).resolves.toBe('ans-id-hcaptcha');
    await expect(
      client.solveFunCaptcha({
        publickey: 'pk',
        pageurl: 'https://example.com',
        surl: 'https://arkose.example',
        data: 'blob',
      }),
    ).resolves.toBe('ans-id-funcaptcha');
  });

  it('solves recaptcha v2 and v3, including aliases, proxy, and enterprise flags', async () => {
    mock.onPost('/in.php').reply((config) => {
      expect(config.params?.softguru).toBe(DEFAULT_SOFTGURU);
      return [200, { status: 1, request: config.params?.version ?? 'v2' }];
    });
    mock.onGet('/res.php').reply(200, { status: 1, request: 'token' });

    await expect(
      client.solveRecaptchaV2({
        googlekey: 'gk',
        pageurl: 'https://example.com',
        invisible: 1,
        dataS: 'datas',
        enterprise: 1,
        proxy: '1.2.3.4:8080',
        proxyType: 'SOCKS5',
        cookies: 'c',
        userAgent: 'ua',
        extra: { pingback: 'https://example.com/hook' },
      }),
    ).resolves.toBe('token');
    await expect(
      client.solveReCaptchaV3({
        googlekey: 'gk',
        pageurl: 'https://example.com',
        action: 'verify',
        minScore: 0.3,
        enterprise: 1,
      }),
    ).resolves.toBe('token');
    await expect(client.solveReCaptchaV2({ googlekey: 'gk', pageurl: 'https://example.com' })).resolves.toBe('token');
    await expect(client.solveRecaptchaV3({ googlekey: 'gk', pageurl: 'https://example.com' })).resolves.toBe('token');
  });

  it('solves geetest tokens from JSON and from a plain string', async () => {
    mock.onPost('/in.php').replyOnce(200, { status: 1, request: 'gt1' });
    mock.onGet('/res.php').replyOnce(200, {
      status: 1,
      request: JSON.stringify({ challenge: 'c1', validate: 'v1', seccode: 's1' }),
    });
    await expect(
      client.solveGeeTest({ gt: 'gt', challenge: 'ch', pageurl: 'https://example.com', apiServer: 'api.geetest.com' }),
    ).resolves.toEqual({ challenge: 'c1', validate: 'v1', seccode: 's1' });

    mock.onPost('/in.php').replyOnce(200, { status: 1, request: { nested: true } });
    mock.onGet('/res.php').replyOnce(200, { status: 1, request: { geetest_challenge: 'c', geetest_validate: 'v' } });
    const fallback = await client.solveGeeTest({ gt: 'gt', challenge: 'ch', pageurl: 'https://example.com' });
    expect(fallback.challenge).toBe('c');
    expect(fallback.validate).toBe('v');
  });

  it('polls through CAPCHA_NOT_READY and honors callbacks, timeouts, and abort', async () => {
    mock.onGet('/res.php').replyOnce(200, { status: 0, request: 'CAPCHA_NOT_READY' });
    mock.onGet('/res.php').replyOnce(200, 'OK|ready-now');
    const attempts: number[] = [];
    await expect(
      client.waitForResult('task', {
        timeoutMs: 1000,
        intervalMs: 0,
        onNotReady: (info) => attempts.push(info.attempt),
      }),
    ).resolves.toBe('ready-now');
    expect(attempts).toEqual([1]);

    mock.reset();
    mock.onGet('/res.php').replyOnce(200, { status: 0, request: 'CAPCHA_NOT_READY' });
    await expect(client.getTaskResult('missing')).resolves.toBeNull();
    mock.onGet('/res.php').replyOnce(200, { status: 0, request: 'ERROR_WRONG_CAPTCHA_ID' });
    await expect(client.getTaskResult('bad')).rejects.toMatchObject({ code: 'ERROR_WRONG_CAPTCHA_ID' });
    mock.onGet('/res.php').reply(200, { status: 0, request: 'CAPCHA_NOT_READY' });
    await expect(client.waitForResult('missing', { timeoutMs: 0, intervalMs: 50 })).rejects.toMatchObject({
      code: 'TIMEOUT',
    });

    const controller = new AbortController();
    controller.abort();
    await expect(client.waitForResult('missing', { signal: controller.signal })).rejects.toMatchObject({
      code: 'ABORTED',
    });

    const later = new AbortController();
    mock.reset();
    mock.onGet('/res.php').reply(200, { status: 0, request: 'CAPCHA_NOT_READY' });
    const pending = client.waitForResult('slow', {
      timeoutMs: 5000,
      intervalMs: 30,
      signal: later.signal,
      onNotReady: () => later.abort(),
    });
    await expect(pending).rejects.toMatchObject({ code: 'ABORTED' });

    mock.reset();
    mock.onGet('/res.php').reply(200, { status: 0, request: 'CAPCHA_NOT_READY' });
    const during = new AbortController();
    const sleeping = client.waitForResult('sleep', {
      timeoutMs: 5000,
      intervalMs: 250,
      signal: during.signal,
    });
    setTimeout(() => during.abort(), 20);
    await expect(sleeping).rejects.toMatchObject({ code: 'ABORTED' });
  });

  it('reports good and bad answers and their aliases', async () => {
    mock.onGet('/res.php').reply((config) => {
      expect(['reportgood', 'reportbad']).toContain(config.params?.action);
      return [200, { status: 1, request: 'OK_REPORT_RECORDED' }];
    });
    await expect(client.reportGood('1')).resolves.toBe(true);
    await expect(client.reportCorrect('1')).resolves.toBe(true);
    await expect(client.reportBad('1')).resolves.toBe(true);
    await expect(client.reportIncorrect('1')).resolves.toBe(true);
  });

  it('solves click, grid, slider, and site-specific tasks', async () => {
    mock.onPost('/in.php').reply((config) => {
      return [200, { status: 1, request: String(config.params?.textinstructions) }];
    });
    mock.onGet('/res.php').reply((config) => {
      const id = String(config.params?.id);
      if (id.includes('grid') || id.endsWith('2')) return [200, { status: 1, request: '1,2,6' }];
      return [200, { status: 1, request: 'coordinates:x=8,y=9' }];
    });

    const click = await client.solveClick({ body: 'img', textinstructions: 'bear', click: CLICK.RECAPTCHA });
    expect(click.points).toEqual([{ x: 8, y: 9 }]);
    expect((await client.solveCoordinates({ body: 'img', textinstructions: 'bear', click: 'recap' })).points).toEqual([
      { x: 8, y: 9 },
    ]);

    const grid = await client.solveRecaptchaClick({ body: 'img', textinstructions: 'grid', grid: true });
    expect(grid.cells).toEqual([1, 2, 6]);
    await client.solveRecaptchaClick({ body: 'img', textinstructions: 'coord' });
    await client.solveHCaptchaClick({ body: 'img', textinstructions: 'grid', grid: true });
    await client.solveHCaptchaClick({ body: 'img', textinstructions: 'h' });
    await client.solveFunCaptchaClick({ body: 'img', textinstructions: 'grid', grid: true });
    await client.solveFunCaptchaClick({ body: 'img', textinstructions: 'f' });
    await client.solveGeeTestClick({ body: 'img', textinstructions: TEXT_INSTRUCTIONS.GEE_TEST_ICON_V4, grid: true });
    await client.solveGeeTestClick({ body: 'img', textinstructions: TEXT_INSTRUCTIONS.SLIDER });

    mock.reset();
    const seen: Array<Record<string, unknown>> = [];
    mock.onPost('/in.php').reply((config) => {
      seen.push({ ...(config.params as Record<string, unknown>) });
      return [200, { status: 1, request: 'id' }];
    });
    mock.onGet('/res.php').reply(200, { status: 1, request: 'coordinate:x=3,y=4' });

    await client.solveBinance({ body: 'img', object: 'dog' });
    await client.solveBinance({ body: 'img', textinstructions: 'binance,slider', grid: true });
    await client.solveTikTok({ variant: 'kolesso', body0: 'bg', body1: 'piece' });
    await client.solveTikTok({ variant: 'koleso', body0: 'bg', body1: 'piece' });
    await client.solveTikTok({ variant: 'abc', body: 'img' });
    await client.solveTikTok({ variant: 'slider', body: 'img' });
    await client.solveTikTok({ variant: 'question', question: 'Which object covers your hair?', body: 'img' });
    await client.solveTikTok({ body: 'img', textinstructions: 'custom' });
    await client.solveAws({ body: 'img', instruction: "Place a dot at the end of the car's path" });
    await client.solveAws({ body: 'img', textinstructions: 'Amazon,already' });
    await client.solveTemu({ body: 'img', textinstructions: 'Please click on the smaller yellow sphere' });
    await client.solveSlider({ body: 'bg', piece: 'piece' });
    await client.solveSlider({ body: 'only' });
    await client.solveSlider({ body0: 'a', body1: 'b', textinstructions: 'kolesso', click: CLICK.GEETEST });
    await client.solveBitget({ body: 'img' });
    await client.solveLinkvertise({ body: 'img', instruction: 'Please click on the globe' });
    await client.solveSeoFast({ body: 'img', instruction: 'mark the bows' });
    await client.solveWorldCash({ body: 'img' });

    const instructions = seen.map((params) => params.textinstructions);
    expect(instructions).toEqual([
      'binance,dog',
      'binance,slider',
      'kolesso',
      'koleso',
      'abc',
      'slider',
      'abc,Which object covers your hair?',
      'custom',
      "Amazon,Place a dot at the end of the car's path",
      'Amazon,already',
      'Please click on the smaller yellow sphere',
      'slider',
      'slider',
      'kolesso',
      'geetesticonhand',
      'custom1221,Please click on the globe',
      'custom1222,mark the bows',
      'custom1224',
    ]);
    expect(seen[0].click).toBe(CLICK.GEETEST);
    expect(seen[1].click).toBe(CLICK.GEETEST_GRID);
    expect(seen[10].click).toBe(CLICK.TEMU);
    expect(seen[11].body0).toBe('bg');
    expect(seen[11].body1).toBe('piece');
    expect(seen[11].body).toBeUndefined();
    expect(seen[12].body).toBe('only');
  });

  it('runs the anti-captcha JSON API', async () => {
    mock.onPost('/createTask').reply((config) => {
      const body = JSON.parse(config.data as string);
      expect(body.clientKey).toBe('test_api_key');
      expect(body.softId).toBe(DEFAULT_SOFTGURU);
      expect(body.softguru).toBe(DEFAULT_SOFTGURU);
      expect(body.languagePool).toBe('en');
      expect(body.task.type).toBe('NoCaptchaTaskProxyless');
      return [200, { errorId: 0, taskId: 7654321 }];
    });
    mock.onPost('/getTaskResult').replyOnce(200, { errorId: 0, status: 'processing' });
    mock.onPost('/getTaskResult').replyOnce(200, {
      errorId: 0,
      status: 'ready',
      taskId: 7654321,
      solution: { gRecaptchaResponse: 'tok' },
    });
    const result = await client.solveJsonTask(
      { type: 'NoCaptchaTaskProxyless', websiteURL: 'https://example.com', websiteKey: 'k' },
      { languagePool: 'en', extra: { softId: 0 }, timeoutMs: 1000, intervalMs: 0 },
    );
    expect(result.solution).toEqual({ gRecaptchaResponse: 'tok' });
    expect(readSolutionToken(result.solution)).toBe('tok');

    mock.onPost('/createTask').reply(200, { errorId: 1, errorCode: 'ERROR_KEY_DOES_NOT_EXIST' });
    await expect(client.createJsonTask({ type: 'ImageToTextTask', body: 'x' })).rejects.toMatchObject({
      code: 'ERROR_KEY_DOES_NOT_EXIST',
    });

    mock.onPost('/getTaskResult').replyOnce(200, { status: 0, request: 'CAPCHA_NOT_READY' });
    await expect(client.getJsonTaskResult('9')).resolves.toBeNull();
    mock.onPost('/getTaskResult').replyOnce(200, { status: 1, request: 'plain-token' });
    await expect(client.getJsonTaskResult('9')).resolves.toMatchObject({ solution: 'plain-token' });
    mock.onPost('/getTaskResult').replyOnce(200, { errorId: 0, status: 'pending' });
    await expect(client.getJsonTaskResult('9')).resolves.toBeNull();
    mock.onPost('/getTaskResult').replyOnce(200, { errorId: 1, errorCode: 'CAPCHA_NOT_READY' });
    await expect(client.getJsonTaskResult('9')).resolves.toBeNull();
    mock.onPost('/getTaskResult').replyOnce(200, 'nope');
    await expect(client.getJsonTaskResult('9')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('retries slot and network failures, and surfaces HTTP and invalid payloads', async () => {
    const retrying = new CapGuruClient({
      apiKey: 'test_api_key',
      maxRetries: 1,
      retryDelayMs: 0,
      defaultPollingIntervalMs: 0,
    });
    mock.onPost('/in.php').replyOnce(200, { status: 0, request: 'ERROR_NO_SLOT_AVAILABLE' });
    mock.onPost('/in.php').replyOnce(200, { status: 1, request: 'after-retry' });
    await expect(retrying.createTask({ method: 'base64', body: 'a' })).resolves.toBe('after-retry');

    mock.onGet('/res.php').networkErrorOnce();
    mock.onGet('/res.php').replyOnce(200, { status: 1, request: '1.25' });
    await expect(retrying.getBalance()).resolves.toBe(1.25);

    const delayed = new CapGuruClient({
      apiKey: 'test_api_key',
      maxRetries: 1,
      retryDelayMs: 5,
      defaultPollingIntervalMs: 0,
    });
    mock.onPost('/in.php').replyOnce(200, { status: 0, request: 'ERROR_NO_SLOT_AVAILABLE' });
    mock.onPost('/in.php').replyOnce(200, { status: 1, request: 'delayed' });
    await expect(delayed.createTask({ method: 'base64', body: 'a' })).resolves.toBe('delayed');

    mock.onPost('/in.php').replyOnce(200, { status: 0, request: 'ERROR_GOOGLEKEY' });
    await expect(retrying.createTask({ method: 'userrecaptcha' })).rejects.toMatchObject({ code: 'ERROR_GOOGLEKEY' });

    mock.onGet('/res.php').replyOnce(500, { status: 0, request: 'ERROR_ZERO_BALANCE' });
    await expect(client.getBalance()).rejects.toBeInstanceOf(ZeroBalanceError);

    mock.onGet('/res.php').replyOnce(502, 'bad gateway');
    await expect(client.getBalance()).rejects.toMatchObject({ code: 'HTTP_ERROR' });

    mock.onPost('/in.php').networkError();
    await expect(client.createTask({ method: 'base64' })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    mock.reset();
    mock.onPost('/in.php').reply(200, { status: 1 });
    await expect(client.createTask({})).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    mock.onPost('/in.php').reply(200, []);
    await expect(client.createTask({})).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    mock.onPost('/in.php').reply(200, '');
    await expect(client.createTask({})).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    mock.onGet('/res.php').reply(200, { status: 2, request: 'weird' });
    await expect(client.getBalance()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    mock.onPost('/createTask').replyOnce(200, { errorId: 0 });
    await expect(client.createJsonTask({ type: 'NoCaptchaTaskProxyless' })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    mock.onPost('/createTask').replyOnce(200, { status: 0, request: 'ERROR_UPLOAD' });
    await expect(client.createJsonTask({ type: 'ImageToTextTask' })).rejects.toMatchObject({ code: 'ERROR_UPLOAD' });
    mock.onPost('/createTask').replyOnce(200, { errorId: 1, errorDescription: 'ERROR_IMAGE_TYPE_NOT_SUPPORTED' });
    await expect(client.createJsonTask({ type: 'ImageToTextTask' })).rejects.toMatchObject({
      code: 'ERROR_IMAGE_TYPE_NOT_SUPPORTED',
    });
    mock.onPost('/getTaskResult').replyOnce(200, { errorId: 0, status: 'unknown' });
    await expect(client.getJsonTaskResult('1')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    mock.onPost('/getTaskResult').replyOnce(200, 'CAPCHA_NOT_READY');
    await expect(client.getJsonTaskResult('1')).resolves.toBeNull();
    mock.onPost('/getTaskResult').replyOnce(200, 'ERROR_UPLOAD');
    await expect(client.getJsonTaskResult('1')).rejects.toMatchObject({ code: 'ERROR_UPLOAD' });
    mock.onPost('/getTaskResult').replyOnce(200, { status: 0, request: 'ERROR_WRONG_CAPTCHA_ID' });
    await expect(client.getJsonTaskResult('1')).rejects.toMatchObject({ code: 'ERROR_WRONG_CAPTCHA_ID' });
    mock.onPost('/getTaskResult').replyOnce(200, { errorId: 1 });
    await expect(client.getJsonTaskResult('1')).rejects.toMatchObject({ code: 'ERROR' });
    mock.onPost('/getTaskResult').replyOnce(200, { status: 1, request: true });
    await expect(client.getJsonTaskResult('1')).resolves.toMatchObject({ solution: true });

    expect(new NoSlotAvailableError('x', 'ERROR_NO_SLOT_AVAILABLE').code).toBe('ERROR_NO_SLOT_AVAILABLE');
  });

  it('waits out JSON tasks that are not ready and times out', async () => {
    mock.onPost('/getTaskResult').reply(200, { errorId: 0, status: 'processing' });
    await expect(client.waitForJsonResult('42', { timeoutMs: 0, intervalMs: 10 })).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
    const controller = new AbortController();
    controller.abort();
    await expect(client.waitForJsonResult('42', { signal: controller.signal, timeoutMs: 1000 })).rejects.toMatchObject({
      code: 'ABORTED',
    });
  });
});

void ready;
