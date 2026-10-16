import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCrisisMode, getCrisisRecommendations, setCrisisMode } from '@/api/crisisModeApi';
import { Button, Skeleton, Spinner } from '@/components/common';
import { getErrorMessage } from '@/utils/errorHandler';

export default function DashboardCrisisMode() {
  const [enabled, setEnabled] = useState(false);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const state = await getCrisisMode();
      const recommendations = state.data.enabled ? await getCrisisRecommendations() : null;
      const currentEnabled = recommendations?.data.enabled ?? state.data.enabled;
      setEnabled(currentEnabled);
      setCount(currentEnabled ? recommendations?.data.recommendations.length ?? 0 : 0);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const enable = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setStatus('loading');
    try {
      const response = await setCrisisMode(true);
      setEnabled(response.data.enabled);
      toast.success(response.data.message);
      if (!response.data.enabled) {
        setCount(0);
        setStatus('ready');
        return;
      }
      try {
        const recommendations = await getCrisisRecommendations();
        setEnabled(recommendations.data.enabled);
        setCount(recommendations.data.recommendations.length);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    } catch (reason) {
      toast.error(getErrorMessage(reason, 'We could not enable Crisis Mode.'));
      setStatus('ready');
    } finally { savingRef.current = false; setSaving(false); }
  };

  return <section aria-label="Crisis Mode" className="app-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
    <div className="flex min-w-0 items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><ShieldCheck className="h-5 w-5" /></div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">Crisis Mode</h2>
          {status === 'ready' && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{enabled ? 'ON' : 'OFF'}</span>}
        </div>
        {status === 'loading' && (saving ? <p role="status" className="mt-1 flex items-center gap-2 text-sm text-content-muted"><Spinner />Enabling Crisis Mode...</p> : <div role="status" aria-label="Loading conservation guidance" className="mt-2 space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-48 max-w-full" /></div>)}
        {status === 'error' && <p role="alert" className="mt-1 text-sm text-content-muted">Could not load Crisis Mode guidance.</p>}
        {status === 'ready' && (enabled ? count > 0 ? (
          <p className="mt-1 text-sm text-content-muted">{count} recommendation{count === 1 ? '' : 's'} for your planned trips</p>
        ) : (
          <div className="mt-1 space-y-0.5">
            <p className="text-sm font-medium text-emerald-700">No immediate fuel-saving actions found.</p>
            <p className="text-xs text-content-muted">Your currently planned trips are already prioritized and optimized.</p>
          </div>
        ) : (
          <div className="mt-1 space-y-0.5">
            <p className="text-sm font-medium text-slate-700">Crisis Mode is off</p>
            <p className="text-xs text-content-muted">Enable it for conservation suggestions based on your planned trips.</p>
          </div>
        ))}
      </div>
    </div>
    {status === 'error' ? <Button variant="secondary" size="sm" onClick={load}>Try again</Button> : status === 'ready' && (
      enabled ? count > 0 ? <Button variant="secondary" size="sm" onClick={() => navigate('/crisis-mode')}>Review recommendations<ArrowRight className="h-3.5 w-3.5" /></Button> : null
        : <Button size="sm" onClick={enable}>Enable Crisis Mode</Button>
    )}
  </section>;
}
