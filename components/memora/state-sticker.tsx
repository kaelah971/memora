import type { ReactNode } from "react";

import { classNames } from "@/lib/class-names";

type StickerTone = "remembered" | "open" | "ready" | "active" | "approved" | "complete";

interface StateStickerProps {
  children?: ReactNode;
  tone: StickerTone;
}

export function StateSticker({ children, tone }: StateStickerProps) {
  return (
    <span className={classNames("state-sticker", `state-sticker--${tone}`)}>
      {children ?? tone.replace("-", " ").toUpperCase()}
    </span>
  );
}
