// Placeholders shaped like the content they stand in for, so the page does not
// jump when the real data arrives.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-secondary ${className}`} />;
}

export function PageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64 w-full" />
    </main>
  );
}

export function CardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-3 px-4 py-16" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
