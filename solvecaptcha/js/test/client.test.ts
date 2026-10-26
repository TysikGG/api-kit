import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  SolveCaptchaClient,
  SolveCaptchaError,
} from '../src/index.js';

describe('SolveCaptchaClient', () => {
  let mock: MockAdapter;
  let client: SolveCaptchaClient;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    client = new SolveCaptchaClient({
      apiKey: 'test_token',
      defaultPollingIntervalMs: 10,
      defaultPollingTimeoutMs: 100,
    });
  });

  afterEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    it('throws error if apiKey is empty', () => {
      expect(() => new SolveCaptchaClient({ apiKey: '' })).toThrow(
        SolveCaptchaError,
      );
    });

    it('accepts string apiKey', () => {
      const c = new SolveCaptchaClient('token_str');
      expect(c).toBeInstanceOf(SolveCaptchaClient);
    });
  });

  describe('getBalance', () => {
    it('returns parsed balance on success', async () => {
      mock.onGet('https://api.solvecaptcha.com/res.php').reply((config) => {
        expect(config.params.key).toBe('test_token');
        expect(config.params.action).toBe('getbalance');
        return [200, { status: 1, request: '15.42' }];
      });

      const balance = await client.getBalance();
      expect(balance).toBe(15.42);
    });

    it('throws SolveCaptchaError on ERROR_WRONG_USER_KEY', async () => {
      mock.onGet('https://api.solvecaptcha.com/res.php').reply(200, {
        status: 0,
        request: 'ERROR_WRONG_USER_KEY',
      });

      await expect(client.getBalance()).rejects.toThrow(SolveCaptchaError);
      await expect(client.getBalance()).rejects.toMatchObject({
        code: 'ERROR_WRONG_USER_KEY',
      });
    });
  });

  describe('createTask & getTaskResult', () => {
    it('creates a task with softId if configured', async () => {
      const clientWithSoft = new SolveCaptchaClient({
        apiKey: 'test_token',
        softId: '9988',
      });

      mock.onPost('https://api.solvecaptcha.com/in.php').reply((config) => {
        expect(config.params.soft_id).toBe('9988');
        expect(config.params.method).toBe('userrecaptcha');
        return [200, { status: 1, request: '2122988149' }];
      });

      const taskId = await clientWithSoft.createTask({
        method: 'userrecaptcha',
      });
      expect(taskId).toBe('2122988149');
    });

    it('returns null when CAPCHA_NOT_READY', async () => {
      mock.onGet('https://api.solvecaptcha.com/res.php').reply(200, {
        status: 0,
        request: 'CAPCHA_NOT_READY',
      });

      const res = await client.getTaskResult('2122988149');
      expect(res).toBeNull();
    });

    it('returns solution string when solved', async () => {
      mock.onGet('https://api.solvecaptcha.com/res.php').reply(200, {
        status: 1,
        request: 'solved_captcha_token',
      });

      const res = await client.getTaskResult('2122988149');
      expect(res).toBe('solved_captcha_token');
    });
  });

  describe('solveImage', () => {
    it('solves base64 image captcha', async () => {
      mock.onPost('https://api.solvecaptcha.com/in.php').reply((config) => {
        expect(config.params.method).toBe('base64');
        expect(config.params.body).toBe('base64imgdata');
        return [200, { status: 1, request: 'task_img_123' }];
      });

      mock.onGet('https://api.solvecaptcha.com/res.php').reply(200, {
        status: 1,
        request: 'captcha_text',
      });

      const text = await client.solveImage({ body: 'base64imgdata' });
      expect(text).toBe('captcha_text');
    });
  });

  describe('solveText', () => {
    it('submits text captcha and resolves answer', async () => {
      mock.onPost('https://api.solvecaptcha.com/in.php').reply((config) => {
        expect(config.params.textcaptcha).toBe('2 + 2 = ?');
        return [200, { status: 1, request: 'task_text_123' }];
      });

      mock.onGet('https://api.solvecaptcha.com/res.php').reply(200, {
        status: 1,
        request: '4',
      });

      const ans = await client.solveText('2 + 2 = ?');
      expect(ans).toBe('4');
    });
  });

  describe('solveRecaptchaV2', () => {
    it('solves recaptcha v2', async () => {
      mock.onPost('https://api.solvecaptcha.com/in.php').reply((config) => {
        expect(config.params.method).toBe('userrecaptcha');
        expect(config.params.googlekey).toBe('site_key_123');
        return [200, { status: 1, request: 'task_recaptcha_123' }];
      });

      mock.onGet('https://api.solvecaptcha.com/res.php').reply(200, {
        status: 1,
        request: 'recaptcha_token_solution',
      });

      const token = await client.solveRecaptchaV2({
        googlekey: 'site_key_123',
        pageurl: 'https://example.com',
      });
      expect(token).toBe('recaptcha_token_solution');
    });
  });

  describe('solveTurnstile', () => {
    it('solves turnstile', async () => {
      mock.onPost('https://api.solvecaptcha.com/in.php').reply((config) => {
        expect(config.params.method).toBe('turnstile');
        expect(config.params.sitekey).toBe('turnstile_key');
        return [200, { status: 1, request: 'task_turnstile_123' }];
      });

      mock.onGet('https://api.solvecaptcha.com/res.php').reply(200, {
        status: 1,
        request: 'turnstile_token_solution',
      });

      const token = await client.solveTurnstile({
        sitekey: 'turnstile_key',
        pageurl: 'https://example.com',
      });
      expect(token).toBe('turnstile_token_solution');
    });
  });

  describe('reportGood and reportBad', () => {
    it('reports good captcha', async () => {
      mock.onGet('https://api.solvecaptcha.com/res.php').reply((config) => {
        expect(config.params.action).toBe('reportgood');
        return [200, { status: 1, request: 'OK_REPORT_RECORDED' }];
      });

      const success = await client.reportGood('task_123');
      expect(success).toBe(true);
    });

    it('reports bad captcha', async () => {
      mock.onGet('https://api.solvecaptcha.com/res.php').reply((config) => {
        expect(config.params.action).toBe('reportbad');
        return [200, { status: 1, request: 'OK_REPORT_RECORDED' }];
      });

      const success = await client.reportBad('task_123');
      expect(success).toBe(true);
    });
  });
});
