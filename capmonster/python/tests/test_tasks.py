"""Task builder coverage."""

from capmonster import (
    alibaba,
    altcha,
    amazon,
    basilisk,
    binance,
    castle,
    complex_funcaptcha,
    complex_hcaptcha,
    complex_image,
    complex_recaptcha,
    complex_recognition,
    datadome,
    friendly_captcha,
    funcaptcha,
    geetest,
    geetest_v3,
    geetest_v4,
    hcaptcha,
    hcaptcha_proxyless,
    hunt,
    image_to_text,
    imperva,
    mtcaptcha,
    no_captcha,
    no_captcha_proxyless,
    prosopo,
    recaptcha_v2,
    recaptcha_v2_enterprise,
    recaptcha_v2_proxyless,
    recaptcha_v3,
    recaptcha_v3_enterprise,
    temu,
    tendi,
    tspd,
    turnstile,
    turnstile_challenge_cookie,
    turnstile_challenge_token,
    turnstile_waiting_room,
    with_proxy,
    yidun,
)


def test_task_builders() -> None:
    assert recaptcha_v2("https://e.com", "k", nocache=True)["nocache"] is True
    assert recaptcha_v2_proxyless("https://e.com", "k")["type"] == "RecaptchaV2TaskProxyless"
    assert no_captcha("https://e.com", "k")["type"] == "NoCaptchaTask"
    assert no_captcha_proxyless("https://e.com", "k")["type"] == "NoCaptchaTaskProxyless"
    assert recaptcha_v2_enterprise("https://e.com", "k")["type"] == "RecaptchaV2EnterpriseTask"
    assert recaptcha_v3("https://e.com", "k", minScore=0.7)["type"] == "RecaptchaV3TaskProxyless"
    assert recaptcha_v3_enterprise("https://e.com", "k")["type"] == "RecaptchaV3EnterpriseTask"
    assert turnstile("https://e.com", "k")["type"] == "TurnstileTask"
    assert turnstile_challenge_token("https://e.com", "k")["cloudflareTaskType"] == "token"
    assert turnstile_challenge_cookie("https://e.com", "k")["cloudflareTaskType"] == "cf_clearance"
    assert turnstile_waiting_room("https://e.com", "k")["cloudflareTaskType"] == "wait_room"
    assert geetest("https://e.com", "gt")["type"] == "GeeTestTask"
    assert geetest_v3("https://e.com", "gt", "ch")["version"] == "3"
    assert geetest_v4("https://e.com", "id", version=4)["version"] == 4
    assert image_to_text("abc", capMonsterModule="yandex")["capMonsterModule"] == "yandex"
    assert complex_image("recaptcha", imagesBase64=["a"])["class"] == "recaptcha"
    assert complex_recaptcha(imagesBase64=["a"])["class"] == "recaptcha"
    assert complex_hcaptcha(imagesBase64=["a"])["class"] == "hcaptcha"
    assert complex_funcaptcha(imagesBase64=["a"])["class"] == "funcaptcha"
    assert complex_recognition(imagesBase64=["a"])["class"] == "recognition"
    assert datadome("https://e.com", {"datadomeCookie": "1"})["class"] == "DataDome"
    assert tendi("https://e.com", "1")["class"] == "TenDI"
    assert amazon("https://e.com", "k")["type"] == "AmazonTask"
    assert binance("https://e.com", "k", "v")["validateId"] == "v"
    assert funcaptcha("https://e.com", "pk")["type"] == "FunCaptchaTask"
    assert hcaptcha("https://e.com", "k")["type"] == "HCaptchaTask"
    assert hcaptcha_proxyless("https://e.com", "k")["type"] == "HCaptchaTaskProxyless"
    assert basilisk("https://e.com", "k")["class"] == "Basilisk"
    imperva_task = imperva("https://e.com", {"incapsulaScriptUrl": "u", "incapsulaCookies": "c"})
    assert imperva_task["class"] == "Imperva"
    assert prosopo("https://e.com", "k")["type"] == "ProsopoTask"
    assert yidun("https://e.com", "k")["type"] == "YidunTask"
    assert mtcaptcha("https://e.com", "k")["type"] == "MTCaptchaTask"
    assert altcha(
        "https://e.com",
        "k",
        {"challenge": "c", "iterations": "1", "salt": "s", "signature": "sig"},
    )["class"] == "altcha"
    assert friendly_captcha("https://e.com", "k", {"apiGetLib": "lib"})["class"] == "friendly"
    assert temu("https://e.com", {"cookie": "a"})["class"] == "Temu"
    assert castle("https://e.com", "k", {"wUrl": "w", "swUrl": "sw"})["class"] == "Castle"
    tspd_task = tspd("https://e.com", "ua", {"tspdCookie": "c", "htmlPageBase64": "a"})
    assert tspd_task["class"] == "tspd"
    assert hunt("https://e.com", {"apiGetLib": "lib"})["class"] == "HUNT"
    assert alibaba("https://e.com", {"sceneId": "s", "prefix": "p"})["class"] == "alibaba"

    proxied = with_proxy(recaptcha_v2("https://e.com", "k"), proxyType="http", proxyPort=8080)
    assert proxied["proxyType"] == "http"
    assert proxied["proxyPort"] == 8080
