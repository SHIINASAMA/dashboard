export const SUPPORTED_PLATFORMS = ["twitter", "github", "gitlab", "reddit"] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export function isSupportedPlatform(platform: string): platform is SupportedPlatform {
  return SUPPORTED_PLATFORMS.includes(platform as SupportedPlatform);
}

export function getPlatformLabelKey(platform: string): string | null {
  if (!isSupportedPlatform(platform)) return null;
  return platform === "twitter" ? "nav.x" : `nav.${platform}`;
}
