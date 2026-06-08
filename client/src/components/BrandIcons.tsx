import { siX, siGithub, siGitlab, siReddit } from "simple-icons";

function BrandIcon({ si, className }: { si: typeof siGithub; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d={si.path} />
    </svg>
  );
}

export function XIcon({ size }: { size?: number }) {
  return <BrandIcon si={siX} className={`w-${size ?? 4} h-${size ?? 4}`} />;
}
export function GithubIcon({ size }: { size?: number }) {
  return <BrandIcon si={siGithub} className={`w-${size ?? 4} h-${size ?? 4}`} />;
}
export function GitlabIcon({ size }: { size?: number }) {
  return <BrandIcon si={siGitlab} className={`w-${size ?? 4} h-${size ?? 4}`} />;
}
export function RedditIcon({ size }: { size?: number }) {
  return <BrandIcon si={siReddit} className={`w-${size ?? 4} h-${size ?? 4}`} />;
}
