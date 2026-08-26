import type { MemoryThreadNode } from "@/types/memora";

import { classNames } from "@/lib/class-names";

interface MemoryThreadProps {
  nodes: readonly MemoryThreadNode[];
  className?: string;
  compact?: boolean;
}

export function MemoryThread({ nodes, className, compact = false }: MemoryThreadProps) {
  return (
    <div className={classNames("memory-thread", compact && "memory-thread--compact", className)}>
      <ol className="memory-thread__list">
        {nodes.map((node) => (
          <li className={classNames("memory-thread__node", `memory-thread__node--${node.tone}`)} key={node.id}>
            <span className="memory-thread__connector" aria-hidden="true" />
            <div className="memory-thread__content">
              <span className="memory-thread__label data-label">{node.label}</span>
              <strong>{node.title}</strong>
              <p>{node.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="sr-only">
        Memory Thread showing {nodes.map((node) => node.title).join(", then ")}.
      </p>
    </div>
  );
}
