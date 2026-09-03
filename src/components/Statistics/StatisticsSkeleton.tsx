type StatisticsSectionSkeletonProps = {
  ariaLabel: string;
  className?: string;
};

const SkeletonBlock = ({ className }: { className: string }) => (
  <div
    aria-hidden="true"
    className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`}
  />
);

export const OverviewSkeleton = () => (
  <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }, (_, index) => (
      <article key={index} className="glass-surface rounded-xl p-4 sm:p-5">
        <SkeletonBlock className="mb-3 h-8 w-3/4" />
        <SkeletonBlock className="h-4 w-1/2" />
      </article>
    ))}
  </section>
);

export const StatisticsSectionSkeleton = ({
  ariaLabel,
  className = "h-48",
}: StatisticsSectionSkeletonProps) => (
  <section aria-label={ariaLabel} className="glass-surface rounded-xl p-4 sm:p-5">
    <SkeletonBlock className="mb-4 h-6 w-1/3" />
    <SkeletonBlock className={`w-full ${className}`} />
  </section>
);
