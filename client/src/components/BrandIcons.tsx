import { SiX, SiGithub, SiGitlab, SiReddit } from "react-icons/si";

function BrandIcon({ Icon, size }: { Icon: React.ComponentType<{ size?: number }>; size?: number }) {
  const s = size ?? 16;
  return <Icon size={s} />;
}

export function XIcon({ size }: { size?: number }) {
  return <BrandIcon Icon={SiX} size={size} />;
}
export function GithubIcon({ size }: { size?: number }) {
  return <BrandIcon Icon={SiGithub} size={size} />;
}
export function GitlabIcon({ size }: { size?: number }) {
  return <BrandIcon Icon={SiGitlab} size={size} />;
}
export function RedditIcon({ size }: { size?: number }) {
  return <BrandIcon Icon={SiReddit} size={size} />;
}
