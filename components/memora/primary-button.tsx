import type { AnchorHTMLAttributes, ReactNode } from "react";

import { classNames } from "@/lib/class-names";

interface PrimaryButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  href: string;
}

export function PrimaryButton({ children, className, href, ...props }: PrimaryButtonProps) {
  return (
    <a className={classNames("primary-button", className)} href={href} {...props}>
      {children}
    </a>
  );
}
