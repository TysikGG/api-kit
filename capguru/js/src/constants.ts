/** Developer id sent as `softguru` (and `softId` on the JSON API). Do not change. */
export const DEFAULT_SOFTGURU = 164125;

/** Historical default host. Official docs also publish api2 and an IPv6 endpoint. */
export const CAPGURU_API_URL = 'https://api.cap.guru';

/** Current documented API host. */
export const CAPGURU_API2_URL = 'https://api2.cap.guru';

/** IPv6 API host documented by Cap.guru. */
export const CAPGURU_IPV6_URL = 'https://ipv6.cap.guru';

/** `click` values for the image-recognition API (`in.php`). */
export const CLICK = {
  RECAPTCHA: 'recap',
  RECAPTCHA_GRID: 'recap2',
  HCAPTCHA: 'hcap',
  HCAPTCHA_GRID: 'hcap2',
  GEETEST: 'geetest',
  GEETEST_GRID: 'geetest2',
  FUNCAPTCHA: 'funcap',
  FUNCAPTCHA_GRID: 'funcap2',
  TEMU: 'temu',
  OTHER: 'oth',
} as const;

export type ClickType = (typeof CLICK)[keyof typeof CLICK] | (string & {});

/**
 * `vernet` presets for text-from-image recognition.
 * @see https://docs.cap.guru/en/apiclick/text.html
 */
export const VERNET = {
  GENERAL_V1: 2,
  GENERAL_V2: 6,
  ARITHMETIC: 22,
  RAMBLER: 12,
  YANDEX: 18,
  YANDEX_6: 20,
  VKONTAKTE: 16,
  SOLVEMEDIA: 14,
  GIBDD: 13,
  OK: 9,
  WORLD_OF_TANKS: 17,
  MICROSOFT: 5,
} as const;

/** Instruction strings documented for slider and icon tasks. */
export const TEXT_INSTRUCTIONS = {
  SLIDER: 'slider',
  TIKTOK_KOLESSO: 'kolesso',
  TIKTOK_KOLESO: 'koleso',
  TIKTOK_ABC: 'abc',
  GEE_TEST_V2: 'geetestv2',
  GEE_TEST_ICON_V4: 'geetesticonv4',
  GEE_TEST_FIVE: 'five',
  GEE_TEST_THREE: 'three',
  GEE_TEST_ICON_HAND: 'geetesticonhand',
  BITGET: 'geetesticonhand',
  LINKVERTISE_PREFIX: 'custom1221',
  SEOFAST_PREFIX: 'custom1222',
  WORLDCASH: 'custom1224',
} as const;

/** Default GeeTest/TikTok slider field width used by Cap.guru (pixels). */
export const DEFAULT_SLIDER_FIELD_WIDTH = 271;

export type ProxyType = 'HTTP' | 'HTTPS' | 'SOCKS4' | 'SOCKS5';
