import { Link } from 'react-router-dom';
import { Edit3, Trash2 } from 'lucide-react';
import type { Vehicle } from '@/types';

type Props =
  | { vehicle: Vehicle; onDelete: () => void; editTo?: never; itemName?: never; resourceLabel?: never }
  | { vehicle?: never; editTo: string; itemName: string; resourceLabel: string; onDelete: () => void };

export default function VehicleActions(props: Props) {
  const editTo = props.vehicle ? `/vehicles/${props.vehicle._id}/edit` : props.editTo;
  const itemName = props.vehicle ? props.vehicle.vehicleName : props.itemName;
  const resourceLabel = props.vehicle ? 'vehicle' : props.resourceLabel;

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        aria-label={`Edit ${resourceLabel} for ${itemName}`}
        to={editTo}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-accent"
        title={`Edit ${resourceLabel}`}
      >
        <Edit3 className="h-3.5 w-3.5" />
      </Link>
      <button
        aria-label={`Delete ${resourceLabel} for ${itemName}`}
        onClick={props.onDelete}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-danger focus-visible:ring-2 focus-visible:ring-danger"
        title={`Delete ${resourceLabel}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

