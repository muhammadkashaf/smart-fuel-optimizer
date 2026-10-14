import { useEffect, useId, useRef, useState } from 'react';
import { Check, MapPin, Search } from 'lucide-react';
import { Input, Spinner } from '@/components/common';
import type { Coordinates } from '@/types';
import { loadGoogleLibrary } from '@/lib/googleMaps';

export type LocationValue = { label: string; coordinates?: Coordinates; name?: string; address?: string };

const KARACHI = { lat: 24.8607, lng: 67.0011 };

export default function LocationSearch({ label, value, onChange, disabled, error: validationError }: {
  label: string;
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  error?: string;
}) {
  const id = useId();
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<google.maps.places.PlacePrediction[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'selecting' | 'error'>('idle');
  const [error, setError] = useState('');
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const query = value.label.trim();

  useEffect(() => {
    if (!open || value.coordinates || query.length < 3 || disabled) return;
    let current = true;
    const timer = window.setTimeout(async () => {
      setState('loading');
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = await loadGoogleLibrary('places');
        if (!current) return;
        session.current ??= new AutocompleteSessionToken();
        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          includedRegionCodes: ['pk'],
          locationBias: { center: KARACHI, radius: 50000 },
          region: 'pk',
          sessionToken: session.current,
        });
        if (!current) return;
        setResults(response.suggestions.flatMap((suggestion) => suggestion.placePrediction ? [suggestion.placePrediction] : []).slice(0, 7));
        setActive(-1);
        setState('ready');
      } catch {
        if (!current) return;
        setError('Place search is unavailable. Check your connection and try again.');
        setState('error');
      }
    }, 450);
    return () => { current = false; window.clearTimeout(timer); };
  }, [query, value.coordinates, open, disabled, retry]);

  const select = async (prediction: google.maps.places.PlacePrediction) => {
    setState('selecting');
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] });
      const country = place.addressComponents?.find((part) => part.types.includes('country'))?.shortText?.toLowerCase();
      if (country !== 'pk' || !place.location) {
        session.current = null;
        setError('Select a location in Pakistan that has map coordinates.');
        setState('error');
        return;
      }
      const name = place.displayName?.trim() || prediction.mainText?.toString() || prediction.text.toString();
      const address = place.formattedAddress?.trim() || prediction.secondaryText?.toString() || 'Pakistan';
      const display = address.toLowerCase().startsWith(name.toLowerCase()) ? address : `${name}, ${address}`;
      onChange({ label: display.slice(0, 500), name, address,
        coordinates: { lat: place.location.lat(), lng: place.location.lng() } });
      session.current = null;
      setOpen(false);
      setResults([]);
      setState('idle');
    } catch {
      session.current = null;
      setError('Place details could not load. Please select the location again.');
      setState('error');
    }
  };
  const showResults = open && !value.coordinates && query.length >= 3;

  return (
    <div className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <Input label={label} aria-label={label} id={id} value={value.label} error={validationError} placeholder="Search a place or address in Pakistan"
        disabled={disabled || state === 'selecting'} maxLength={200} autoComplete="off" role="combobox" aria-autocomplete="list"
        aria-expanded={showResults} aria-controls={`${id}-results`} aria-describedby={`${id}-hint`}
        aria-activedescendant={showResults && active >= 0 ? `${id}-option-${active}` : undefined}
        onFocus={() => setOpen(true)}
        onChange={(event) => { if (value.coordinates) session.current = null; onChange({ label: event.target.value }); setResults([]); setState('idle'); setActive(-1); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpen(false); return; }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive((index) => results.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : -1);
          }
          if (event.key === 'Enter' && showResults) {
            event.preventDefault();
            if (active >= 0 && results[active] && state !== 'selecting') void select(results[active]);
          }
        }} />
      <p id={`${id}-hint`} className={`mt-1.5 flex items-center gap-1 text-xs ${value.coordinates ? 'text-success' : 'text-content-muted'}`}>
        {value.coordinates ? <><Check className="h-3 w-3" />Location selected</> : 'Choose a suggestion to pin this location.'}
      </p>
      {showResults && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-control border border-line bg-surface shadow-overlay">
          {(state === 'loading' || state === 'idle' || state === 'selecting') && <p role="status" className="flex items-center gap-2 p-3 text-xs text-content-muted"><Spinner />{state === 'selecting' ? 'Confirming place...' : 'Searching places...'}</p>}
          {state === 'error' && <div role="alert" className="space-y-2 p-3 text-xs text-danger"><p>{error}</p><button type="button" className="font-semibold underline" onClick={() => setRetry((count) => count + 1)}>Try again</button></div>}
          {state === 'ready' && results.length === 0 && <p role="status" className="flex items-start gap-2 p-3 text-xs text-content-muted"><Search className="h-4 w-4 shrink-0" /><span>No matching location found. Try a different name or add a city in Pakistan.</span></p>}
          {state === 'ready' && <ul id={`${id}-results`} role="listbox" aria-label={`${label} suggestions`}>
            {results.map((prediction, index) => (
              <li key={prediction.placeId} role="none">
                <button type="button" id={`${id}-option-${index}`} role="option" aria-selected={index === active}
                  className={`flex w-full items-start gap-2 border-b border-line/60 px-3 py-3 text-left text-xs leading-relaxed last:border-0 hover:bg-accent-soft ${active === index ? 'bg-accent-soft' : ''}`}
                  onMouseDown={(event) => event.preventDefault()} onClick={() => void select(prediction)}>
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span className="min-w-0"><span className="block font-medium text-content">{prediction.mainText?.toString() || prediction.text.toString()}</span><span className="block text-content-muted">{prediction.secondaryText?.toString() || 'Pakistan'}</span></span>
                </button>
              </li>
            ))}
          </ul>}
          <p className="border-t border-line bg-surface-muted px-3 py-2 text-[10px] text-content-muted">Place search by Google Maps</p>
        </div>
      )}
    </div>
  );
}
