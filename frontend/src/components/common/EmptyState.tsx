import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: typeof Inbox;
}) => (
  <div className="app-panel flex flex-col items-center justify-center px-6 py-14 text-center">
    <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 ring-8 ring-slate-50 text-slate-600">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
    <p className="mx-auto mt-1 max-w-sm text-sm text-content-muted">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

