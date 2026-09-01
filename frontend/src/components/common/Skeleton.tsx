export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />
);

export const PageSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <Skeleton className="h-10 w-32 rounded-control" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="app-panel p-5 space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="app-panel p-5 space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="app-panel p-5 space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
    <div className="app-panel p-6 space-y-4">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-3 pt-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

