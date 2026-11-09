import { SteelProxy } from "../../src/index.js";

const apiKey = process.env.STEELPROXY_API_KEY;
const describeIf = apiKey ? describe : describe.skip;

describeIf("SteelProxy live API", () => {
  it("fetches proxy types and directory catalogs without spending money", async () => {
    const client = new SteelProxy({ apiKey });

    const types = await client.getProxyTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);

    const locations = await client.getLocations();
    expect(Array.isArray(locations)).toBe(true);

    const terms = await client.getTerms();
    expect(Array.isArray(terms)).toBe(true);

    const orders = await client.getOrders({ page: 1, page_size: 5 });
    expect(typeof orders.total).toBe("number");
    expect(Array.isArray(orders.items)).toBe(true);
  });
});
