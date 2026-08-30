import { describe, it, expect } from "vitest";
import { getPlatformFetchLevels, FETCH_LEVELS_BY_PLATFORM } from "../lib/application/scheduler/fetchPolicy";

describe("fetch capability source of truth", () => {
  it("exposes github L0/L1/L2", () => {
    expect(getPlatformFetchLevels("github")).toEqual(["l0", "l1", "l2"]);
  });

  it("exposes only L1 for gitlab/reddit/twitter", () => {
    expect(getPlatformFetchLevels("gitlab")).toEqual(["l1"]);
    expect(getPlatformFetchLevels("reddit")).toEqual(["l1"]);
    expect(getPlatformFetchLevels("twitter")).toEqual(["l1"]);
  });

  it("falls back to L1 for an unknown platform", () => {
    expect(getPlatformFetchLevels("nonsense")).toEqual(["l1"]);
  });

  it("does not expose an unsupported L2 for gitlab (UI/backend mismatch guard)", () => {
    // This is the invariant the TriggerPanel used to violate: the UI must never
    // offer a level the backend cannot run.
    expect(FETCH_LEVELS_BY_PLATFORM.gitlab).not.toContain("l2");
  });
});
