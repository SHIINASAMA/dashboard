import { describe, it, expect } from "bun:test";
import { isReleaseAsset, sumFilteredDownloads } from "../utils/release-asset-filter";

describe("isReleaseAsset", () => {
  it("accepts platform installers", () => {
    expect(isReleaseAsset("app-v1.0.dmg")).toBe(true);
    expect(isReleaseAsset("app-v1.0.exe")).toBe(true);
    expect(isReleaseAsset("app-v1.0.msi")).toBe(true);
    expect(isReleaseAsset("app-v1.0.AppImage")).toBe(true);
    expect(isReleaseAsset("app-v1.0-linux-arm64.tar.xz")).toBe(true);
    expect(isReleaseAsset("app-v1.0-linux-amd64.deb")).toBe(true);
    expect(isReleaseAsset("app-v1.0-linux-amd64.rpm")).toBe(true);
    expect(isReleaseAsset("app-v1.0-linux-amd64.flatpak")).toBe(true);
  });

  it("accepts archives", () => {
    expect(isReleaseAsset("source-v1.0.tar.gz")).toBe(true);
    expect(isReleaseAsset("v1.0.zip")).toBe(true);
    expect(isReleaseAsset("v1.0.tar.zst")).toBe(true);
  });

  it("accepts mobile packages", () => {
    expect(isReleaseAsset("app-v1.0.apk")).toBe(true);
    expect(isReleaseAsset("app-v1.0.ipa")).toBe(true);
  });

  it("rejects update-check files", () => {
    expect(isReleaseAsset("latest.json")).toBe(false);
    expect(isReleaseAsset("latest.yml")).toBe(false);
    expect(isReleaseAsset("latest-mac.yml")).toBe(false);
    expect(isReleaseAsset("latest-linux.json")).toBe(false);
  });

  it("rejects blockmap and nupkg", () => {
    expect(isReleaseAsset("app-v1.0.blockmap")).toBe(false);
    expect(isReleaseAsset("app-1.0.0-full.nupkg")).toBe(false);
  });

  it("rejects non-release files", () => {
    expect(isReleaseAsset("LICENSE")).toBe(false);
    expect(isReleaseAsset("README.md")).toBe(false);
    expect(isReleaseAsset("SHA256SUMS")).toBe(false);
    expect(isReleaseAsset("app-v1.0.dmg.sig")).toBe(false);
  });

  it("handles case insensitivity", () => {
    expect(isReleaseAsset("app-v1.0.DMG")).toBe(true);
    expect(isReleaseAsset("LATEST.YML")).toBe(false);
  });
});

describe("sumFilteredDownloads", () => {
  it("sums only release asset downloads", () => {
    const assets = [
      { name: "app-v1.0.dmg", download_count: 100 },
      { name: "latest.json", download_count: 5000 },
      { name: "latest-mac.yml", download_count: 3000 },
      { name: "app-v1.0.exe", download_count: 200 },
    ];
    expect(sumFilteredDownloads(assets)).toBe(300);
  });

  it("returns 0 for empty array", () => {
    expect(sumFilteredDownloads([])).toBe(0);
  });

  it("returns 0 when all assets are filtered out", () => {
    const assets = [
      { name: "latest.json", download_count: 5000 },
      { name: "latest.yml", download_count: 3000 },
    ];
    expect(sumFilteredDownloads(assets)).toBe(0);
  });
});
