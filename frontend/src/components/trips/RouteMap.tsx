import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { Button, Spinner } from '@/components/common';
import { loadGoogleLibrary } from '@/lib/googleMaps';
import type { Coordinates, RouteOption } from '@/types';

const KARACHI = { lat: 24.8607, lng: 67.0011 };

export default function RouteMap({ start, destination, options, selectedId, onSelect }: {
  start?: Coordinates;
  destination?: Coordinates;
  options: RouteOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const lines = useRef<google.maps.Polyline[]>([]);
  const onSelectRef = useRef(onSelect);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const fit = useCallback(() => {
    if (!map.current) return;
    const bounds = new google.maps.LatLngBounds();
    const selected = options.find((option) => option.id === selectedId);
    if (selected) selected.geometry.coordinates.forEach(([lng, lat]) => bounds.extend({ lat, lng }));
    else [start, destination].forEach((point) => { if (point) bounds.extend(point); });
    if (!bounds.isEmpty()) map.current.fitBounds(bounds, 44);
  }, [start, destination, options, selectedId]);

  useEffect(() => {
    let active = true;
    Promise.all([loadGoogleLibrary('maps'), loadGoogleLibrary('marker')]).then(([{ Map }]) => {
      if (!active || !container.current) return;
      map.current = new Map(container.current, { center: KARACHI, zoom: 11, streetViewControl: false, mapTypeControl: false,
        fullscreenControl: false, clickableIcons: false, gestureHandling: 'greedy' });
      setState('ready');
    }).catch(() => { if (active) setState('error'); });
    return () => {
      active = false;
      markers.current.forEach((marker) => marker.setMap(null));
      lines.current.forEach((line) => line.setMap(null));
      markers.current = []; lines.current = []; map.current = null;
    };
  }, []);

  useEffect(() => {
    if (state !== 'ready' || !map.current) return;
    markers.current.forEach((marker) => marker.setMap(null));
    lines.current.forEach((line) => line.setMap(null));
    markers.current = [];
    lines.current = [];
    for (const [position, letter, color] of [[start, 'A', '#2563eb'], [destination, 'B', '#0f172a']] as const) {
      if (position) markers.current.push(new google.maps.Marker({ map: map.current, position, title: letter === 'A' ? 'Starting point' : 'Destination',
        label: { text: letter, color: '#ffffff', fontWeight: '700' },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 15, fillColor: color, fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 } }));
    }
    for (const option of [...options.filter((item) => item.id !== selectedId), ...options.filter((item) => item.id === selectedId)]) {
      const selected = option.id === selectedId;
      const line = new google.maps.Polyline({ map: map.current,
        path: option.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: selected ? '#2563eb' : '#94a3b8', strokeWeight: selected ? 6 : 4,
        strokeOpacity: selected ? 1 : 0.65, zIndex: selected ? 2 : 1, clickable: true });
      line.addListener('click', () => onSelectRef.current(option.id));
      lines.current.push(line);
    }
    fit();
  }, [state, start, destination, options, selectedId, fit]);

  useEffect(() => {
    if (state !== 'ready' || !container.current) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [state, fit]);

  return (
    <section className="app-panel min-w-0 overflow-hidden" aria-label="Route map">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3 text-xs text-content-muted"><span><strong className="text-accent">A</strong> Start</span><span><strong className="text-slate-800">B</strong> Destination</span></div>
        <Button variant="ghost" size="sm" disabled={state !== 'ready' || (!start && !destination)} onClick={fit}><Maximize2 className="h-3.5 w-3.5" />Fit route</Button>
      </div>
      <div className="relative h-[340px] w-full bg-surface-muted sm:h-[460px] lg:h-[520px]">
        <div ref={container} className="h-full w-full" aria-label="Interactive Google route map" />
        {state === 'loading' && <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 bg-surface-muted text-sm text-content-muted"><Spinner />Loading Google Map...</div>}
        {state === 'error' && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center text-sm text-danger"><p>Google Map could not load. Check the browser key and your connection. Route comparisons remain available.</p><Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Retry map</Button></div>}
      </div>
      <p role="status" className="border-t border-line px-4 py-2.5 text-xs text-content-muted">
        {options.length ? 'Select a route card or line to highlight it. Drag to pan and use + / − to zoom.' : 'Your selected locations will appear here. Find routes to see the journey.'}
      </p>
    </section>
  );
}
