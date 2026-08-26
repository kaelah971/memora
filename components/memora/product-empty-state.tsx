import { SecondaryLink } from "@/components/memora/secondary-link";

interface ProductEmptyStateProps {
  eyebrow: string;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}

export function ProductEmptyState({
  eyebrow,
  title,
  description,
  href,
  actionLabel,
}: ProductEmptyStateProps) {
  return (
    <section className="product-empty-state" aria-labelledby="empty-state-title">
      <div className="empty-state__fragment" aria-hidden="true">
        <span className="empty-state__fragment-line" />
        <span className="data-label">SOURCE / WAITING</span>
      </div>
      <div>
        <span className="section-label">{eyebrow}</span>
        <h2 id="empty-state-title">{title}</h2>
        <p>{description}</p>
        {href && actionLabel ? <SecondaryLink href={href}>{actionLabel}</SecondaryLink> : null}
      </div>
    </section>
  );
}
