const RELEASE_EXTENSIONS = new Set([
  // macOS
  ".dmg", ".pkg",
  // Windows
  ".exe", ".msi",
  // Linux
  ".deb", ".rpm", ".appimage", ".flatpak", ".snap",
  // Archives
  ".tar.gz", ".tgz", ".tar.xz", ".tar.bz2", ".tar.zst",
  ".zip", ".rar", ".7z",
  // Mobile
  ".apk", ".aab", ".ipa",
]);

const EXCLUDE_PATTERNS = [
  /^latest[\w-]*\.(json|yml|yaml)$/i,
  /\.blockmap$/,
  /\.nupkg$/,
  /\.sig$/,
  /\.asc$/,
  /^SHA256SUMS$/i,
  /^SHA512SUMS$/i,
  /^MD5SUMS$/i,
];

export function isReleaseAsset(filename: string): boolean {
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(filename)) return false;
  }
  const lower = filename.toLowerCase();
  for (const ext of RELEASE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export function sumFilteredDownloads<T extends { name: string; download_count: number }>(
  assets: T[],
): number {
  return assets
    .filter((a) => isReleaseAsset(a.name))
    .reduce((sum, a) => sum + (a.download_count || 0), 0);
}
