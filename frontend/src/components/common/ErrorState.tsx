import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export const ErrorState = ({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) => (
  <div className="app-panel flex flex-col items-center justify-center border-danger-border bg-danger-soft/30 px-6 py-12 text-center">
    <div className="grid h-11 w-11 place-items-center rounded-xl bg-danger-soft text-danger ring-8 ring-red-50">
      <AlertCircle className="h-5 w-5" />
    </div>
    <h3 className="mt-4 text-base font-semibold text-slate-900">Unable to load data</h3>
    <p className="mx-auto mt-1 max-w-md text-sm text-content-muted">{message}</p>
    {retry && (
      <div className="mt-5">
        <Button variant="secondary" size="sm" onClick={retry}>
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    )}
  </div>
);

