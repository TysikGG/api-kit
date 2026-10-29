import {
  CAPMONSTER_ERROR_CLASSES,
  CAPMONSTER_ERRORS,
  CapMonsterError,
  ZeroBalanceError,
  createCapMonsterError,
  describeCapMonsterError,
  isRetryableCapMonsterError,
} from "../src/index.js";

describe("CapMonster errors", () => {
  it("maps every documented code to a subclass", () => {
    for (const code of Object.keys(CAPMONSTER_ERRORS)) {
      const err = createCapMonsterError(CAPMONSTER_ERRORS[code], 1, code, 200, { errorId: 1 });
      expect(err).toBeInstanceOf(CapMonsterError);
      expect(err).toBeInstanceOf(CAPMONSTER_ERROR_CLASSES[code]);
      expect(err.name).not.toBe("");
      expect(err.errorCode).toBe(code);
      expect(err.message).toBe(CAPMONSTER_ERRORS[code]);
    }
  });

  it("falls back to the base class for an unknown code", () => {
    const err = createCapMonsterError("custom", 7, "ERROR_UNKNOWN", 200);
    expect(err).toBeInstanceOf(CapMonsterError);
    expect(err.constructor).toBe(CapMonsterError);
    expect(describeCapMonsterError("ERROR_UNKNOWN", undefined, 7)).toBe("ERROR_UNKNOWN");
    expect(describeCapMonsterError(undefined, undefined, 7)).toBe("API error #7");
    expect(describeCapMonsterError(undefined, "from api", 7)).toBe("from api");
  });

  it("retries only transient failures", () => {
    expect(
      isRetryableCapMonsterError(
        createCapMonsterError("down", 1, "ERROR_SERVICE_NOT_AVAILABLE", 200),
      ),
    ).toBe(true);
    expect(
      isRetryableCapMonsterError(createCapMonsterError("limit", 1, "ERROR_TOO_MUCH_REQUESTS", 200)),
    ).toBe(true);
    expect(isRetryableCapMonsterError(createCapMonsterError("bad gateway", 0, undefined, 502))).toBe(
      true,
    );
    expect(isRetryableCapMonsterError(createCapMonsterError("network", 0))).toBe(true);
    expect(isRetryableCapMonsterError(new ZeroBalanceError("no funds", 1, "ERROR_ZERO_BALANCE"))).toBe(
      false,
    );
    expect(isRetryableCapMonsterError(new Error("nope"))).toBe(false);
    expect(isRetryableCapMonsterError(createCapMonsterError("aborted", 0, "ABORTED"))).toBe(false);
  });
});
