import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  EmailType,
  NotLetters,
  NotLettersBadRequestError,
  NotLettersError,
  NotLettersPaymentRequiredError,
  NotLettersUnauthorizedError,
  parseMail,
} from "../src/index.js";

describe("NotLetters client", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  describe("authentication and headers", () => {
    it("sends Bearer token and default headers", async () => {
      const client = new NotLetters({ apiToken: "test-token" });

      mock.onGet("https://api.notletters.com/v1/me").reply((config) => {
        expect(config.headers?.Authorization).toBe("Bearer test-token");
        expect(config.headers?.["User-Agent"]).toBe("notletters/0.1.0");
        return [
          200,
          {
            data: {
              id: "test-id",
              username: "tester",
              balance: 100,
              rate_limit: 10,
            },
          },
        ];
      });

      const me = await client.getMe();
      expect(me.username).toBe("tester");
      expect(me.balance).toBe(100);
    });

    it("supports custom baseURL and userAgent", async () => {
      const client = new NotLetters({
        apiToken: "custom-token",
        baseURL: "https://custom.api.com/v1",
        userAgent: "custom-agent/1.0",
      });

      mock.onGet("https://custom.api.com/v1/me").reply((config) => {
        expect(config.headers?.Authorization).toBe("Bearer custom-token");
        expect(config.headers?.["User-Agent"]).toBe("custom-agent/1.0");
        return [
          200,
          {
            data: {
              id: "test-id",
              username: "custom",
              balance: 50,
              rate_limit: 5,
            },
          },
        ];
      });

      const me = await client.getMe();
      expect(me.balance).toBe(50);
    });
  });

  describe("getMe & getBalance", () => {
    it("successfully retrieves user profile data and balance", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      mock.onGet("https://api.notletters.com/v1/me").reply(200, {
        data: {
          id: "a215cf9d-1248-2ab1-8d98-421bc4f12a82",
          username: "NotLetters",
          balance: 1000.5,
          rate_limit: 10,
        },
      });

      const profile = await client.getMe();
      expect(profile.id).toBe("a215cf9d-1248-2ab1-8d98-421bc4f12a82");
      expect(profile.username).toBe("NotLetters");
      expect(profile.balance).toBe(1000.5);
      expect(profile.rate_limit).toBe(10);

      const balance = await client.getBalance();
      expect(balance).toBe(1000.5);
    });

    it("throws NotLettersUnauthorizedError on 401 response", async () => {
      const client = new NotLetters({ apiToken: "invalid-token" });

      mock.onGet("https://api.notletters.com/v1/me").reply(401, {
        error: "Unauthorized",
      });

      await expect(client.getMe()).rejects.toThrow(NotLettersUnauthorizedError);
      await expect(client.getBalance()).rejects.toThrow(NotLettersUnauthorizedError);
    });

    it("throws on missing data wrapper", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      mock.onGet("https://api.notletters.com/v1/me").reply(200, {});

      await expect(client.getMe()).rejects.toThrow(NotLettersError);
    });
  });

  describe("getLetters", () => {
    it("successfully retrieves letters with optional filters", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      const mockLetters = [
        {
          id: "89917e2b-880e-447f-b14c-2a95ced8e548",
          sender: "noreply@notletters.com",
          sender_name: "NotLetters",
          subject: "Заголовок письма",
          letter: {
            html: "<body>Пример письма</body>",
            text: "Пример письма",
          },
          star: false,
          date: 1729076880,
        },
      ];

      mock.onPost("https://api.notletters.com/v1/letters").reply((config) => {
        const body = JSON.parse(config.data);
        expect(body.email).toBe("test@notletters.com");
        expect(body.password).toBe("12345678");
        expect(body.filters?.search).toBe("Пример");
        expect(body.filters?.star).toBe(false);

        return [200, { data: { letters: mockLetters } }];
      });

      const letters = await client.getLetters({
        email: "test@notletters.com",
        password: "12345678",
        filters: { search: "Пример", star: false },
      });

      expect(letters).toHaveLength(1);
      expect(letters[0].id).toBe("89917e2b-880e-447f-b14c-2a95ced8e548");
      expect(letters[0].sender).toBe("noreply@notletters.com");
      expect(letters[0].subject).toBe("Заголовок письма");
      expect(letters[0].letter.text).toBe("Пример письма");
    });

    it("validates required email and password fields", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      await expect(
        client.getLetters({ email: "", password: "pass" })
      ).rejects.toThrow("email is required");

      await expect(
        client.getLetters({ email: "user@test.com", password: "" })
      ).rejects.toThrow("password is required");
    });

    it("throws NotLettersBadRequestError on 400 error", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      mock.onPost("https://api.notletters.com/v1/letters").reply(400, {
        error: "Invalid email credentials",
      });

      await expect(
        client.getLetters({ email: "wrong@test.com", password: "bad" })
      ).rejects.toThrow(NotLettersBadRequestError);
    });
  });

  describe("changePassword", () => {
    it("successfully changes mailbox password", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      mock.onPost("https://api.notletters.com/v1/change-password").reply((config) => {
        const body = JSON.parse(config.data);
        expect(body.email).toBe("test@notletters.com");
        expect(body.old_password).toBe("87654321");
        expect(body.new_password).toBe("12345678");

        return [200, { code: 200, data: "password successful changed" }];
      });

      const result = await client.changePassword({
        email: "test@notletters.com",
        oldPassword: "87654321",
        newPassword: "12345678",
      });

      expect(result.code).toBe(200);
      expect(result.data).toBe("password successful changed");
    });

    it("validates required changePassword parameters", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      await expect(
        client.changePassword({ email: "", oldPassword: "old", newPassword: "new" })
      ).rejects.toThrow("email is required");

      await expect(
        client.changePassword({ email: "a@b.com", oldPassword: "", newPassword: "new" })
      ).rejects.toThrow("old_password is required");

      await expect(
        client.changePassword({ email: "a@b.com", oldPassword: "old", newPassword: "" })
      ).rejects.toThrow("new_password is required");
    });

    it("throws NotLettersError on API failure", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      mock.onPost("https://api.notletters.com/v1/change-password").reply(400, {
        error: "Password does not meet requirements",
      });

      await expect(
        client.changePassword({
          email: "test@notletters.com",
          old_password: "old",
          new_password: "short",
        })
      ).rejects.toThrow(NotLettersBadRequestError);
    });
  });

  describe("buyEmails", () => {
    it("successfully purchases emails and parses credentials", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      mock.onPost("https://api.notletters.com/v1/buy-emails").reply((config) => {
        const body = JSON.parse(config.data);
        expect(body.count).toBe(2);
        expect(body.type_email).toBe(EmailType.UNLIMITED);

        return [
          200,
          {
            code: 200,
            data: [
              "box1@notletters.com:pass1",
              "box2@notletters.com:pass2",
            ],
          },
        ];
      });

      const emails = await client.buyEmails({
        count: 2,
        typeEmail: EmailType.UNLIMITED,
      });

      expect(emails).toHaveLength(2);
      expect(emails[0].email).toBe("box1@notletters.com");
      expect(emails[0].password).toBe("pass1");
      expect(emails[0].raw).toBe("box1@notletters.com:pass1");

      expect(emails[1].email).toBe("box2@notletters.com");
      expect(emails[1].password).toBe("pass2");
    });

    it("validates count parameter", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      await expect(
        client.buyEmails({ count: 0, typeEmail: EmailType.LIMIT })
      ).rejects.toThrow("count must be an integer greater than or equal to 1");
    });

    it("throws NotLettersPaymentRequiredError when insufficient balance", async () => {
      const client = new NotLetters({ apiToken: "valid-token" });

      mock.onPost("https://api.notletters.com/v1/buy-emails").reply(402, {
        error: "Insufficient funds",
      });

      await expect(
        client.buyEmails({ count: 10, typeEmail: EmailType.LIMIT })
      ).rejects.toThrow(NotLettersPaymentRequiredError);
    });
  });

  describe("parseMail utility", () => {
    it("correctly parses email:password strings", () => {
      const res = parseMail("user@example.com:secret123");
      expect(res.email).toBe("user@example.com");
      expect(res.password).toBe("secret123");
      expect(res.raw).toBe("user@example.com:secret123");
    });

    it("handles strings with colons inside password", () => {
      const res = parseMail("user@example.com:secret:part2");
      expect(res.email).toBe("user@example.com");
      expect(res.password).toBe("secret:part2");
    });

    it("handles strings without a colon", () => {
      const res = parseMail("plainuser@example.com");
      expect(res.email).toBe("plainuser@example.com");
      expect(res.password).toBe("");
    });
  });
});
