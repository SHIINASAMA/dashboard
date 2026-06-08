import { SiX, SiGithub, SiGitlab, SiReddit } from "react-icons/si";

function BrandIcon({ Icon, className }: { Icon: React.ComponentType<{ className?: string }>; className?: string }) {
  return <Icon className={className} />;
}

export function XIcon({ size }: { size?: number }) {
  return <BrandIcon Icon={SiX} className={`w-${size ?? 4} h-${size ?? 4}`} />;
}
export function GithubIcon({ size }: { size?: number }) {
  return <BrandIcon Icon={SiGithub} className={`w-${size ?? 4} h-${size ?? 4}`} />;
}
export function GitlabIcon({ size }: { size?: number }) {
  return <BrandIcon Icon={SiGitlab} className={`w-${size ?? 4} h-${size ?? 4}`} />;
}
export function RedditIcon({ size }: { size?: number }) {
  return <BrandIcon Icon={SiReddit} className={`w-${size ?? 4} h-${size ?? 4}`} />;
}
