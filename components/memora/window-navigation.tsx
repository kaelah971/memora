import type { ReactNode } from "react";

import { classNames } from "@/lib/class-names";

export interface WindowNavItem {
  href: string;
  label: string;
}

interface WindowNavigationProps {
  items: readonly WindowNavItem[];
  activeHref?: string;
  action?: ReactNode;
  className?: string;
}

export function WindowNavigation({
  items,
  activeHref,
  action,
  className,
}: WindowNavigationProps) {
  return (
    <nav className={classNames("window-navigation", className)} aria-label="Memora navigation">
      <a className="window-navigation__brand" href={items[0]?.href ?? "#top"}>
        MEMORA
      </a>
      <div className="window-navigation__items">
        {items.slice(1).map((item) => (
          <a
            className={classNames(
              "window-navigation__item",
              activeHref === item.href && "window-navigation__item--active",
            )}
            href={item.href}
            key={item.href}
            aria-current={activeHref === item.href ? "page" : undefined}
          >
            {item.label}
          </a>
        ))}
      </div>
      {action ? <div className="window-navigation__action">{action}</div> : null}
    </nav>
  );
}
