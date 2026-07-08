type LangColors = Record<string, string>;

export const LANG_COLORS: LangColors = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Go: "#00ADD8",
  Rust: "#dea584", Java: "#b07219", Ruby: "#701516", C: "#555555", "C++": "#f34b7d",
  "C#": "#178600", Swift: "#F05138", Kotlin: "#A97BFF", PHP: "#4F5D95",
  HTML: "#e34c26", CSS: "#563d7c", Shell: "#89e051", Lua: "#000080",
  Dart: "#00B4AB", Elixir: "#6e4a7e", Haskell: "#5e5086", Zig: "#ec915c",
  OCaml: "#ec6813", Reason: "#ff5847", Makefile: "#427819", Dockerfile: "#384d54",
  CMake: "#DA3434", Roff: "#ecdebe", SCSS: "#c6538c", Vue: "#41b883",
  Svelte: "#ff3e00", Astro: "#ff5a03", MDX: "#fcb32c", Nix: "#7e7eff",
  HCL: "#844FBA", JSON: "#292929", YAML: "#cb171e", TOML: "#9c4221",
  Markdown: "#083fa1", JupyterNotebook: "#DA5B0B",
};

export function languageColor(lang: string): string {
  return LANG_COLORS[lang] ?? "#6e7681";
}
