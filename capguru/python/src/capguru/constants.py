"""Public constants for the Cap.guru client."""

# Developer id sent as softguru / softId. Do not change.
DEFAULT_SOFTGURU = 164125

CAPGURU_API_URL = "https://api.cap.guru"
CAPGURU_API2_URL = "https://api2.cap.guru"
CAPGURU_IPV6_URL = "https://ipv6.cap.guru"

CLICK = {
    "RECAPTCHA": "recap",
    "RECAPTCHA_GRID": "recap2",
    "HCAPTCHA": "hcap",
    "HCAPTCHA_GRID": "hcap2",
    "GEETEST": "geetest",
    "GEETEST_GRID": "geetest2",
    "FUNCAPTCHA": "funcap",
    "FUNCAPTCHA_GRID": "funcap2",
    "TEMU": "temu",
    "OTHER": "oth",
}

VERNET = {
    "GENERAL_V1": 2,
    "GENERAL_V2": 6,
    "ARITHMETIC": 22,
    "RAMBLER": 12,
    "YANDEX": 18,
    "YANDEX_6": 20,
    "VKONTAKTE": 16,
    "SOLVEMEDIA": 14,
    "GIBDD": 13,
    "OK": 9,
    "WORLD_OF_TANKS": 17,
    "MICROSOFT": 5,
}

TEXT_INSTRUCTIONS = {
    "SLIDER": "slider",
    "TIKTOK_KOLESSO": "kolesso",
    "TIKTOK_KOLESO": "koleso",
    "TIKTOK_ABC": "abc",
    "GEE_TEST_V2": "geetestv2",
    "GEE_TEST_ICON_V4": "geetesticonv4",
    "GEE_TEST_FIVE": "five",
    "GEE_TEST_THREE": "three",
    "GEE_TEST_ICON_HAND": "geetesticonhand",
    "BITGET": "geetesticonhand",
    "LINKVERTISE_PREFIX": "custom1221",
    "SEOFAST_PREFIX": "custom1222",
    "WORLDCASH": "custom1224",
}

DEFAULT_SLIDER_FIELD_WIDTH = 271

PROXY_TYPES = ("HTTP", "HTTPS", "SOCKS4", "SOCKS5")
