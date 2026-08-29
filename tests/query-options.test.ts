import { describe, it, expect } from "vitest";
import { createPulseQuery } from "../lib/api/queryOptions";

describe("queryOptions", () => {
  it("creates pulse query", () => {
    const q = createPulseQuery(7);
    expect(q.queryKey).toEqual(["pulse", 7]);
    expect(typeof q.queryFn).toBe("function");
  });
  it("creates pulse query for 30 days", () => {
    const q = createPulseQuery(30);
    expect(q.queryKey).toEqual(["pulse", 30]);
  });
});
