import { COUNTRIES, SERVICES, findCountry } from "../src/index.js";

/** Offline catalog lookup. No API key and no network. */
const kazakhstan = findCountry("kazakhstan");
const england = findCountry(16);
console.log(`${Object.keys(COUNTRIES).length} countries, ${Object.keys(SERVICES).length} services`);
console.log(kazakhstan?.code, kazakhstan?.info.handlerId, SERVICES.tg, SERVICES.wa, england?.code);
