import type { ReactNode } from 'react';

export const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-content-muted">{subtitle}</p>}
    </div>
    {action && <div className="flex shrink-0 items-center gap-2.5">{action}</div>}
  </div>
);

