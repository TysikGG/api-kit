import {
  alibabaTask,
  altchaTask,
  amazonTask,
  basiliskTask,
  binanceTask,
  castleTask,
  complexFunCaptchaTask,
  complexHCaptchaTask,
  complexImageTask,
  complexRecaptchaTask,
  complexRecognitionTask,
  dataDomeTask,
  friendlyCaptchaTask,
  funCaptchaTask,
  geeTestTask,
  geeTestV3Task,
  geeTestV4Task,
  hCaptchaProxylessTask,
  hCaptchaTask,
  huntTask,
  imageToTextTask,
  impervaTask,
  mtCaptchaTask,
  noCaptchaProxylessTask,
  noCaptchaTask,
  prosopoTask,
  recaptchaV2EnterpriseTask,
  recaptchaV2ProxylessTask,
  recaptchaV2Task,
  recaptchaV3EnterpriseTask,
  recaptchaV3Task,
  tenDITask,
  temuTask,
  tspdTask,
  turnstileChallengeCookieTask,
  turnstileChallengeTokenTask,
  turnstileTask,
  turnstileWaitingRoomTask,
  withProxy,
  yidunTask,
} from "../src/index.js";

describe("task builders", () => {
  it("builds every documented task type", () => {
    expect(recaptchaV2Task({ websiteURL: "https://e.com", websiteKey: "k", nocache: true })).toMatchObject({
      type: "RecaptchaV2Task",
      nocache: true,
    });
    expect(recaptchaV2ProxylessTask({ websiteURL: "https://e.com", websiteKey: "k" }).type).toBe(
      "RecaptchaV2TaskProxyless",
    );
    expect(noCaptchaTask({ websiteURL: "https://e.com", websiteKey: "k" }).type).toBe("NoCaptchaTask");
    expect(noCaptchaProxylessTask({ websiteURL: "https://e.com", websiteKey: "k" }).type).toBe(
      "NoCaptchaTaskProxyless",
    );
    expect(
      recaptchaV2EnterpriseTask({ websiteURL: "https://e.com", websiteKey: "k", apiDomain: "www.recaptcha.net" })
        .type,
    ).toBe("RecaptchaV2EnterpriseTask");
    expect(recaptchaV3Task({ websiteURL: "https://e.com", websiteKey: "k", minScore: 0.7 }).type).toBe(
      "RecaptchaV3TaskProxyless",
    );
    expect(recaptchaV3EnterpriseTask({ websiteURL: "https://e.com", websiteKey: "k" }).type).toBe(
      "RecaptchaV3EnterpriseTask",
    );
    expect(turnstileTask({ websiteURL: "https://e.com", websiteKey: "k" }).type).toBe("TurnstileTask");
    expect(
      turnstileChallengeTokenTask({ websiteURL: "https://e.com", websiteKey: "k", pageAction: "managed" })
        .cloudflareTaskType,
    ).toBe("token");
    expect(
      turnstileChallengeCookieTask({
        websiteURL: "https://e.com",
        websiteKey: "x",
        htmlPageBase64: "PGh0bWw+",
        userAgent: "ua",
      }).cloudflareTaskType,
    ).toBe("cf_clearance");
    expect(
      turnstileWaitingRoomTask({
        websiteURL: "https://e.com",
        websiteKey: "x",
        htmlPageBase64: "PGh0bWw+",
        userAgent: "ua",
      }).cloudflareTaskType,
    ).toBe("wait_room");

    expect(geeTestTask({ websiteURL: "https://e.com", gt: "gt" }).type).toBe("GeeTestTask");
    expect(geeTestV3Task({ websiteURL: "https://e.com", gt: "gt", challenge: "ch" }).version).toBe("3");
    expect(geeTestV4Task({ websiteURL: "https://e.com", gt: "captcha-id", version: 4 }).version).toBe(4);

    expect(imageToTextTask({ body: "abc", capMonsterModule: "yandex", math: true }).capMonsterModule).toBe(
      "yandex",
    );
    expect(complexImageTask({ class: "recaptcha", imagesBase64: ["a"] }).class).toBe("recaptcha");
    expect(complexRecaptchaTask({ imagesBase64: ["a"] }).class).toBe("recaptcha");
    expect(complexHCaptchaTask({ imagesBase64: ["a"] }).class).toBe("hcaptcha");
    expect(complexFunCaptchaTask({ imagesBase64: ["a"] }).class).toBe("funcaptcha");
    expect(complexRecognitionTask({ imagesBase64: ["a"] }).class).toBe("recognition");

    expect(
      dataDomeTask({
        websiteURL: "https://e.com",
        metadata: { datadomeCookie: "datadome=1" },
      }).class,
    ).toBe("DataDome");
    expect(tenDITask({ websiteURL: "https://e.com", websiteKey: "1" }).class).toBe("TenDI");
    expect(amazonTask({ websiteURL: "https://e.com", websiteKey: "k", cookieSolution: true }).type).toBe(
      "AmazonTask",
    );
    expect(binanceTask({ websiteURL: "https://e.com", websiteKey: "k", validateId: "v" }).validateId).toBe(
      "v",
    );
    expect(funCaptchaTask({ websiteURL: "https://e.com", websitePublicKey: "pk" }).type).toBe(
      "FunCaptchaTask",
    );
    expect(hCaptchaTask({ websiteURL: "https://e.com", websiteKey: "k", isInvisible: true }).type).toBe(
      "HCaptchaTask",
    );
    expect(hCaptchaProxylessTask({ websiteURL: "https://e.com", websiteKey: "k" }).type).toBe(
      "HCaptchaTaskProxyless",
    );
    expect(basiliskTask({ websiteURL: "https://e.com", websiteKey: "k" }).class).toBe("Basilisk");
    expect(
      impervaTask({
        websiteURL: "https://e.com",
        metadata: { incapsulaScriptUrl: "https://e.com/s", incapsulaCookies: "a=b" },
      }).class,
    ).toBe("Imperva");
    expect(prosopoTask({ websiteURL: "https://e.com", websiteKey: "k" }).type).toBe("ProsopoTask");
    expect(yidunTask({ websiteURL: "https://e.com", websiteKey: "k" }).type).toBe("YidunTask");
    expect(mtCaptchaTask({ websiteURL: "https://e.com", websiteKey: "k" }).type).toBe("MTCaptchaTask");
    expect(
      altchaTask({
        websiteURL: "https://e.com",
        websiteKey: "k",
        metadata: { challenge: "c", iterations: "1", salt: "s", signature: "sig" },
      }).class,
    ).toBe("altcha");
    expect(
      friendlyCaptchaTask({
        websiteURL: "https://e.com",
        websiteKey: "k",
        metadata: { apiGetLib: "https://e.com/lib" },
      }).class,
    ).toBe("friendly");
    expect(temuTask({ websiteURL: "https://e.com", metadata: { cookie: "a=b" } }).class).toBe("Temu");
    expect(
      castleTask({
        websiteURL: "https://e.com",
        websiteKey: "k",
        metadata: { wUrl: "https://e.com/w", swUrl: "https://e.com/sw" },
      }).class,
    ).toBe("Castle");
    expect(
      tspdTask({
        websiteURL: "https://e.com",
        userAgent: "ua",
        metadata: { tspdCookie: "c", htmlPageBase64: "a" },
      }).class,
    ).toBe("tspd");
    expect(huntTask({ websiteURL: "https://e.com", metadata: { apiGetLib: "https://e.com/lib" } }).class).toBe(
      "HUNT",
    );
    expect(alibabaTask({ websiteURL: "https://e.com", metadata: { sceneId: "s", prefix: "p" } }).class).toBe(
      "alibaba",
    );
  });

  it("copies proxy fields onto a task", () => {
    const task = withProxy(recaptchaV2Task({ websiteURL: "https://e.com", websiteKey: "k" }), {
      proxyType: "socks5",
      proxyAddress: "1.2.3.4",
      proxyPort: 1080,
      proxyLogin: "user",
      proxyPassword: "secret",
    });
    expect(task.proxyType).toBe("socks5");
    expect(task.proxyPort).toBe(1080);
    expect(task.type).toBe("RecaptchaV2Task");
  });
});
