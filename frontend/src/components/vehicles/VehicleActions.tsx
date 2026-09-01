import { Link } from 'react-router-dom';
import { Edit3, Trash2 } from 'lucide-react';
import type { Vehicle } from '@/types';

export default function VehicleActions({
  vehicle,
  onDelete,
}: {
  vehicle: Vehicle;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        aria-label={`Edit ${vehicle.vehicleName}`}
        to={`/vehicles/${vehicle._id}/edit`}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-accent"
        title="Edit vehicle"
      >
        <Edit3 className="h-3.5 w-3.5" />
      </Link>
      <button
        aria-label={`Delete ${vehicle.vehicleName}`}
        onClick={onDelete}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-danger focus-visible:ring-2 focus-visible:ring-danger"
        title="Delete vehicle"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

