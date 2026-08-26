import type { ReactNode } from "react";

import { classNames } from "@/lib/class-names";

interface BrowserChromeProps {
  label?: string;
}

export function BrowserChrome({ label = "memora / memory desk" }: BrowserChromeProps) {
  return (
    <div className="browser-chrome" aria-hidden="true">
      <div className="browser-chrome__dots">
        <span className="browser-chrome__dot browser-chrome__dot--red" />
        <span className="browser-chrome__dot browser-chrome__dot--yellow" />
        <span className="browser-chrome__dot browser-chrome__dot--green" />
      </div>
      <span className="browser-chrome__label">{label}</span>
    </div>
  );
}

interface BrowserWindowProps {
  children: ReactNode;
  className?: string;
  chromeLabel?: string;
  title?: string;
}

export function BrowserWindow({
  children,
  className,
  chromeLabel,
  title,
}: BrowserWindowProps) {
  return (
    <article
      className={classNames("browser-window", className)}
      aria-label={title ? `${title} window` : undefined}
    >
      <BrowserChrome label={chromeLabel} />
      <div className="browser-window__body">{children}</div>
    </article>
  );
}
