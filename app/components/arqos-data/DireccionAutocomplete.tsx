'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  text?: string;
}

interface MapboxGeocodeResponse {
  features?: MapboxFeature[];
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (direccion: string, lat: number, lng: number) => void;
  placeholder?: string;
  onEnter?: () => void;
}

export function DireccionAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  onEnter,
}: Props) {
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Track if the latest change came from user typing vs programmatic selection.
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    debounceRef.current = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      fetch(
        `/api/mapbox/geocode?q=${encodeURIComponent(q)}&limit=5`,
        { signal: ctrl.signal },
      )
        .then(async (res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
          const data = (await res.json()) as MapboxGeocodeResponse;
          setSuggestions(data.features ?? []);
          setOpen((data.features ?? []).length > 0);
          setActiveIndex(-1);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          setSuggestions([]);
          setOpen(false);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Close dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (feat: MapboxFeature) => {
    skipNextFetchRef.current = true;
    onChange(feat.place_name);
    const [lng, lat] = feat.center;
    onSelect(feat.place_name, lat, lng);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        return;
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
    }
    if (e.key === 'Enter' && onEnter) onEnter();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Ej: Colonia del Valle, CDMX'}
          className="w-full px-4 py-3.5 pr-10 bg-arqos-gray-100 border border-arqos-gray-200 rounded-xl text-sm text-arqos-black placeholder:text-arqos-gray-400 focus:ring-2 focus:ring-arqos-black focus:bg-white outline-none transition-all"
          autoComplete="off"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-arqos-gray-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
        </span>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-20 left-0 right-0 mt-2 bg-white border border-arqos-gray-200 rounded-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] overflow-hidden max-h-72 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((feat, i) => (
            <li key={feat.id} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onClick={() => handleSelect(feat)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-start gap-3 ${
                  i === activeIndex
                    ? 'bg-arqos-gray-100 text-arqos-black'
                    : 'text-arqos-gray-600 hover:bg-arqos-gray-100'
                }`}
              >
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-arqos-gray-400" />
                <span className="flex-1">{feat.place_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
