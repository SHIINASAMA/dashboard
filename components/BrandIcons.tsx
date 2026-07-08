"use client";

import { SiX, SiGithub, SiGitlab, SiReddit } from "react-icons/si";

function BrandIcon({ Icon, size, className }: { Icon: React.ComponentType<{ size?: number; className?: string }>; size?: number; className?: string }) {
  const s = size ?? 16;
  return <Icon size={s} className={className} />;
}

export function XIcon({ size, className }: { size?: number; className?: string }) {
  return <BrandIcon Icon={SiX} size={size} className={className} />;
}
export function GithubIcon({ size, className }: { size?: number; className?: string }) {
  return <BrandIcon Icon={SiGithub} size={size} className={className} />;
}
export function GitlabIcon({ size, className }: { size?: number; className?: string }) {
  return <BrandIcon Icon={SiGitlab} size={size} className={className} />;
}
export function RedditIcon({ size, className }: { size?: number; className?: string }) {
  return <BrandIcon Icon={SiReddit} size={size} className={className} />;
}
