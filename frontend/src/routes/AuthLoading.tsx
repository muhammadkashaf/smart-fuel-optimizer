import { Spinner } from '@/components/common';

export default function AuthLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-canvas"
      role="status"
      aria-label="Restoring your session"
    >
      <Spinner />
      <span className="ml-2 text-sm text-content-muted">Loading your workspace...</span>
    </div>
  );
}
