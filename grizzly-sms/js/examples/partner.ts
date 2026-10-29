/**
 * Sends a partner SMS push when GRIZZLY_PARTNER_KEY is set, and prints inbound reply shapes.
 */
import {
  GrizzlyPartner,
  parsePartnerRequest,
  partnerFinishResponse,
  partnerNumberResponse,
  partnerServicesResponse,
} from "../src/index.js";

async function main() {
  const inbound = parsePartnerRequest({
    action: "GET_NUMBER",
    key: "partner-key",
    country: 0,
    operator: "any",
    service: "tg",
    sum: 1,
  });
  console.log(
    inbound.action,
    partnerServicesResponse([{ country: 0, operatorMap: { any: { tg: 10 } } }]),
    partnerNumberResponse({ number: 79990001122, activationId: 15 }),
    partnerFinishResponse(),
  );

  const key = process.env.GRIZZLY_PARTNER_KEY;
  if (!key) {
    console.log("Set GRIZZLY_PARTNER_KEY to send a live PUSH_SMS");
    return;
  }
  const partner = new GrizzlyPartner({ key });
  const status = await partner.pushSms({
    smsId: 1,
    phone: 447472190082,
    phoneFrom: "Microsoft",
    text: "code 5015",
  });
  console.log(status.status, status.error);
}

main();
