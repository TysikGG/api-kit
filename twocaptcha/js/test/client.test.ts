import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { TwoCaptchaClient, DEFAULT_SOFT_ID, TwoCaptchaError } from '../src/index.js';

describe('TwoCaptchaClient', () => {
  let mock: MockAdapter;
  let client: TwoCaptchaClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new TwoCaptchaClient({ apiKey: 'test_api_key', defaultPollingIntervalMs: 5 });
  });

  afterEach(() => {
    mock.restore();
  });

  it('includes soft_id in createTask requests', async () => {
    mock.onPost('/in.php').reply((config) => {
      expect(config.params?.soft_id).toBe(DEFAULT_SOFT_ID);
      expect(config.params?.soft_id).toBe('5920');
      expect(config.params?.key).toBe('test_api_key');
      return [200, { status: 1, request: '12345' }];
    });

    const taskId = await client.createTask({ method: 'base64', body: 'abc' });
    expect(taskId).toBe('12345');
  });

  describe('getBalance', () => {
    it('returns parsed balance', async () => {
      mock.onGet('/res.php').reply(200, { status: 1, request: '15.75' });
      const balance = await client.getBalance();
      expect(balance).toBe(15.75);
    });

    it('throws error when balance request fails', async () => {
      mock.onGet('/res.php').reply(200, { status: 0, request: 'ERROR_KEY_DOES_NOT_EXIST' });
      await expect(client.getBalance()).rejects.toThrow(TwoCaptchaError);
    });
  });

  describe('solvers', () => {
    it('solves image captcha', async () => {
      mock.onPost('/in.php').reply(200, { status: 1, request: 'task_image' });
      mock.onGet('/res.php').reply(200, { status: 1, request: 'text_result' });

      const res = await client.solveImage('base64_data');
      expect(res).toBe('text_result');
    });

    it('solves text captcha', async () => {
      mock.onPost('/in.php').reply(200, { status: 1, request: 'task_text' });
      mock.onGet('/res.php').reply(200, { status: 1, request: 'answer' });

      const res = await client.solveText('Question?');
      expect(res).toBe('answer');
    });

    it('solves recaptcha v2', async () => {
      mock.onPost('/in.php').reply(200, { status: 1, request: 'task_v2' });
      mock.onGet('/res.php').reply(200, { status: 1, request: 'token_v2' });

      const res = await client.solveRecaptchaV2({ googlekey: 'gk', pageurl: 'https://example.com' });
      expect(res).toBe('token_v2');
    });

    it('solves recaptcha v3', async () => {
      mock.onPost('/in.php').reply(200, { status: 1, request: 'task_v3' });
      mock.onGet('/res.php').reply(200, { status: 1, request: 'token_v3' });

      const res = await client.solveRecaptchaV3({ googlekey: 'gk', pageurl: 'https://example.com' });
      expect(res).toBe('token_v3');
    });

    it('solves turnstile', async () => {
      mock.onPost('/in.php').reply(200, { status: 1, request: 'task_ts' });
      mock.onGet('/res.php').reply(200, { status: 1, request: 'token_ts' });

      const res = await client.solveTurnstile({ sitekey: 'sk', pageurl: 'https://example.com' });
      expect(res).toBe('token_ts');
    });

    it('solves hcaptcha', async () => {
      mock.onPost('/in.php').reply(200, { status: 1, request: 'task_hc' });
      mock.onGet('/res.php').reply(200, { status: 1, request: 'token_hc' });

      const res = await client.solveHCaptcha({ sitekey: 'sk', pageurl: 'https://example.com' });
      expect(res).toBe('token_hc');
    });

    it('solves funcaptcha', async () => {
      mock.onPost('/in.php').reply(200, { status: 1, request: 'task_fc' });
      mock.onGet('/res.php').reply(200, { status: 1, request: 'token_fc' });

      const res = await client.solveFunCaptcha({ publickey: 'pk', pageurl: 'https://example.com' });
      expect(res).toBe('token_fc');
    });

    it('solves geetest', async () => {
      mock.onPost('/in.php').reply(200, { status: 1, request: 'task_gt' });
      mock.onGet('/res.php').reply(200, {
        status: 1,
        request: JSON.stringify({ challenge: 'c1', validate: 'v1', seccode: 's1' }),
      });

      const res = await client.solveGeeTest({ gt: 'gt1', challenge: 'c1', pageurl: 'https://example.com' });
      expect(res).toEqual({ challenge: 'c1', validate: 'v1', seccode: 's1' });
    });
  });

  describe('feedback & reports', () => {
    it('reportGood succeeds', async () => {
      mock.onGet('/res.php').reply(200, { status: 1, request: 'OK_REPORT_RECORDED' });
      const ok = await client.reportGood('12345');
      expect(ok).toBe(true);
    });

    it('reportBad succeeds', async () => {
      mock.onGet('/res.php').reply(200, { status: 1, request: 'OK_REPORT_RECORDED' });
      const ok = await client.reportBad('12345');
      expect(ok).toBe(true);
    });
  });
});
