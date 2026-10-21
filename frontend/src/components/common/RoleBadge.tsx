import type { User } from '@/types';
import StatusBadge from './StatusBadge';

export default function RoleBadge({ role }: { role: User['role'] }) {
  const tone = role === 'Admin' ? 'accent' : role === 'Individual' ? 'success' : 'neutral';
  return <StatusBadge tone={tone}>{role}</StatusBadge>;
}
