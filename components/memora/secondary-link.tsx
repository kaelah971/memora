import type { AnchorHTMLAttributes, ReactNode } from "react";

import { classNames } from "@/lib/class-names";

interface SecondaryLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  href: string;
}

export function SecondaryLink({ children, className, href, ...props }: SecondaryLinkProps) {
  return (
    <a className={classNames("secondary-link", className)} href={href} {...props}>
      <span>{children}</span>
      <span className="secondary-link__arrow" aria-hidden="true">
        &rarr;
      </span>
    </a>
  );
}
