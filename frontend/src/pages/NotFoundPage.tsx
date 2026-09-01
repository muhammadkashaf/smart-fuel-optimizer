import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/common';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6 text-center">
      <div className="app-panel w-full max-w-md p-8 sm:p-10">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent ring-8 ring-blue-50">
          <Compass className="h-6 w-6" />
        </div>

        <div className="mt-6 space-y-2">
          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-semibold text-slate-700">
            404 Error
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Page not found</h1>
          <p className="text-sm text-content-muted">
            The page you are trying to access does not exist or has been moved.
          </p>
        </div>

        <div className="mt-6 pt-2">
          <Link to="/dashboard">
            <Button size="md" className="w-full">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to workspace dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

