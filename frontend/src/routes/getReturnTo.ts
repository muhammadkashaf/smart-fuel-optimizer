export default function getReturnTo(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('from' in state)) return null;
  const from = state.from;
  if (!from || typeof from !== 'object' || !('pathname' in from)) return null;
  const pathname = from.pathname;
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//'))
    return null;
  const search = 'search' in from && typeof from.search === 'string' ? from.search : '';
  const hash = 'hash' in from && typeof from.hash === 'string' ? from.hash : '';
  return `${pathname}${search}${hash}`;
}
