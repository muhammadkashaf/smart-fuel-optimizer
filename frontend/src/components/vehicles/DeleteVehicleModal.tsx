import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Spinner } from '@/components/common';

export default function DeleteVehicleModal({
  open,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-overlay sm:p-7">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger ring-8 ring-red-50">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="delete-title" className="text-lg font-bold tracking-tight text-slate-900">
              Delete vehicle record
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-content-muted">
              Are you sure you want to permanently remove this vehicle record? This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
          <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={onConfirm} disabled={loading}>
            {loading && <Spinner />}
            <span>Delete vehicle</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
