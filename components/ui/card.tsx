"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/client/utils";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return <div className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement> & { children?: ReactNode }) {
  return <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props}>{children}</h3>;
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement> & { children?: ReactNode }) {
  return <p className={cn("text-sm text-[var(--muted-foreground)]", className)} {...props}>{children}</p>;
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return <div className={cn("p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props}>{children}</div>;
}
