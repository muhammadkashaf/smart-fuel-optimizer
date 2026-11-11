import { Skeleton } from './Skeleton';

export default function ListSkeleton({
  label = 'Loading records',
  contentOnly = false,
}: {
  label?: string;
  contentOnly?: boolean;
}) {
  return (
    <div role="status" aria-label={label} className="space-y-4">
      {!contentOnly && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-60 max-w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="app-panel flex gap-3 p-4">
            <Skeleton className="h-10 w-full sm:w-64" />
            <Skeleton className="hidden h-10 w-40 sm:block" />
          </div>
        </>
      )}
      <div className="app-panel overflow-hidden">
        <div className="border-b border-line p-4">
          <Skeleton className="h-4 w-28" />
        </div>
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex gap-5 border-b border-line/60 p-5 last:border-0">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 sm:w-48" />
              <Skeleton className="h-3 w-1/2 sm:w-32" />
            </div>
            <Skeleton className="hidden h-5 w-24 sm:block" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
