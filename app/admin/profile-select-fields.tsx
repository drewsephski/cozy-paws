'use client';

import { useState } from 'react';
import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spokes } from '@/components/ui/spokes';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { LocationResult } from '@/app/api/locations/search/route';

type SuggestionFieldProps = {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
  suggestions: readonly string[];
  hint: string;
  className?: string;
};

export function SuggestionField({ label, name, defaultValue, placeholder, suggestions, hint, className }: SuggestionFieldProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);

  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <input
              id={name}
              name={name}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-11 text-sm outline-none transition focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10"
            />
            <PopoverTrigger asChild>
              <button type="button" aria-label={`Show ${label.toLowerCase()} suggestions`} className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <ChevronDown className="size-4" aria-hidden="true" />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent align="end" sideOffset={5} collisionPadding={12} className="max-h-60 w-[min(22rem,calc(100vw-6rem))] overflow-y-auto overscroll-contain p-1 sm:w-[28rem]">
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-[.12em] text-muted-foreground">Suggested starting points</p>
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => { setValue(suggestion); setOpen(false); }} className="flex w-full items-start gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] leading-4 transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
              <Check className={cn('size-3.5 shrink-0 text-emerald-600', value !== suggestion && 'opacity-0')} aria-hidden="true" />
              {suggestion}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const serviceOptions = ['Dog walking', 'Drop-in visits', 'Overnight stays', 'Dog sitting', 'Cat sitting', 'Puppy care', 'Senior pet care', 'Medication visits', 'Pet transportation', 'House sitting'] as const;

export function ServicesField({ defaultValue, className }: { defaultValue: string[]; className?: string }) {
  const [selected, setSelected] = useState(defaultValue);
  const [customValue, setCustomValue] = useState('');
  const [open, setOpen] = useState(false);

  function toggle(service: string) {
    setSelected((current) => current.includes(service) ? current.filter((item) => item !== service) : current.length < 8 ? [...current, service] : current);
  }

  function addCustom() {
    const value = customValue.trim();
    if (!value || selected.includes(value) || selected.length >= 8) return;
    setSelected((current) => [...current, value]);
    setCustomValue('');
  }

  return (
    <div className={className}>
      <label id="services-label" className="mb-1.5 block text-xs font-medium text-muted-foreground">Services you offer</label>
      <input type="hidden" name="services" value={selected.join(', ')} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-labelledby="services-label" aria-expanded={open} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left outline-none transition hover:border-foreground/25 focus-visible:border-emerald-500/70 focus-visible:ring-4 focus-visible:ring-emerald-500/10">
            <span className={cn('min-w-0 flex-1 text-sm', selected.length === 0 && 'text-muted-foreground')}>{selected.length > 0 ? `${selected.length} service${selected.length === 1 ? '' : 's'} selected` : 'Choose services'}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={5} collisionPadding={12} className="max-h-[min(22rem,calc(100vh-5rem))] w-[min(24rem,calc(100vw-6rem))] overflow-y-auto overscroll-contain p-1.5 sm:w-[30rem] sm:p-2">
          {selected.length > 0 && <div className="mb-1.5 flex flex-wrap gap-1 border-b border-border pb-1.5">{selected.map((service) => <span key={service} className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 py-0.5 pl-2 pr-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">{service}<button type="button" onClick={() => toggle(service)} aria-label={`Remove ${service}`} className="grid size-4 place-items-center rounded-full hover:bg-emerald-500/15"><X className="size-2.5" aria-hidden="true" /></button></span>)}</div>}
          <div className="mb-1.5 flex items-center gap-1.5 border-b border-border pb-1.5">
            <input value={customValue} onChange={(event) => setCustomValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } }} placeholder="Add a custom service" className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30" />
            <Button type="button" variant="outline" size="sm" onClick={addCustom} disabled={!customValue.trim() || selected.length >= 8}>Add</Button>
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            {serviceOptions.map((service) => {
              const active = selected.includes(service);
              return <button key={service} type="button" onClick={() => toggle(service)} className={cn('flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-xs leading-4 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30', active && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300')}><span className={cn('grid size-4 shrink-0 place-items-center rounded border', active && 'border-emerald-500 bg-emerald-500 text-white')}>{active && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}</span><span className="truncate">{service}</span></button>;
            })}
          </div>
          <p className="px-1.5 pt-1.5 text-[11px] text-muted-foreground">Choose up to eight services.</p>
        </PopoverContent>
      </Popover>
      <p className="mt-1.5 text-xs text-muted-foreground">Select several services or add your own.</p>
    </div>
  );
}

type SelectedArea = Pick<LocationResult, 'id' | 'label' | 'latitude' | 'longitude'>;

export function ServiceAreaField({ defaultValue, className }: { defaultValue: string; className?: string }) {
  const [selected, setSelected] = useState<SelectedArea[]>(() => defaultValue.split(' • ').filter(Boolean).map((label) => ({ id: `saved-${label}`, label, latitude: 0, longitude: 0 })));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const mappedArea = [...selected].reverse().find((area) => area.latitude !== 0 || area.longitude !== 0);

  async function searchLocations() {
    if (query.trim().length < 2) return;
    setStatus('loading');
    try {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query.trim())}`);
      const data = (await response.json()) as { results?: LocationResult[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setResults(data.results ?? []);
      setStatus('idle');
      setOpen(true);
    } catch {
      setResults([]);
      setStatus('error');
    }
  }

  function addArea(result: LocationResult) {
    setSelected((current) => current.some((area) => area.label === result.label) || current.length >= 5 ? current : [...current, result]);
  }

  const mapUrl = mappedArea ? `https://www.openstreetmap.org/export/embed.html?bbox=${mappedArea.longitude - 0.04}%2C${mappedArea.latitude - 0.025}%2C${mappedArea.longitude + 0.04}%2C${mappedArea.latitude + 0.025}&layer=mapnik&marker=${mappedArea.latitude}%2C${mappedArea.longitude}` : '';

  return (
    <div className={className}>
      <label htmlFor="location-search" className="mb-1.5 block text-xs font-medium text-muted-foreground">Areas you serve</label>
      <input type="hidden" name="location" value={selected.map((area) => area.label).join(' • ')} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="flex min-w-0 gap-2">
            <div className="relative min-w-0 flex-1"><MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input id="location-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchLocations(); } }} placeholder={selected.length > 0 ? `${selected.length} area${selected.length === 1 ? '' : 's'} selected` : 'City, neighborhood, or ZIP'} autoComplete="off" className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500/70 focus:ring-4 focus:ring-emerald-500/10" /></div>
            <Button type="button" variant="outline" size="icon" aria-label="Search locations" onClick={searchLocations} disabled={query.trim().length < 2 || status === 'loading'} className="size-11">{status === 'loading' ? <Spokes aria-hidden="true" /> : <Search aria-hidden="true" />}</Button>
          </div>
        </PopoverAnchor>
        <PopoverContent align="start" sideOffset={5} collisionPadding={12} className="max-h-[min(22rem,calc(100vh-5rem))] w-[min(26rem,calc(100vw-6rem))] overflow-y-auto overscroll-contain p-1.5 sm:w-[34rem] sm:p-2">
          <div className="flex items-center justify-between gap-2 px-1.5 py-1"><div><p className="text-[13px] font-medium">Choose service areas</p><p className="text-[11px] text-muted-foreground">Add up to five places.</p></div><button type="button" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Close location picker"><X className="size-3.5" aria-hidden="true" /></button></div>
          {status === 'error' && <p role="alert" className="mx-2 my-2 text-xs text-destructive">Location search is unavailable. Try again in a moment.</p>}
          {results.length === 0 && status !== 'error' ? <p className="mx-1.5 my-2 rounded-lg bg-muted/50 px-2.5 py-2.5 text-center text-[11px] text-muted-foreground">Search for a city, neighborhood, or ZIP code.</p> : <div className="mt-1 space-y-0.5 border-t border-border pt-1">{results.map((result) => {
            const active = selected.some((area) => area.label === result.label);
            return <button key={result.id} type="button" onClick={() => addArea(result)} disabled={active || selected.length >= 5} className="flex w-full min-w-0 items-start gap-1.5 rounded-md px-1.5 py-1.5 text-left transition hover:bg-muted disabled:opacity-50"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted"><MapPin className="size-3" aria-hidden="true" /></span><span className="min-w-0 flex-1 overflow-hidden"><span className="block truncate text-[13px] font-medium leading-4">{result.label}</span><span className="block truncate text-[11px] leading-4 text-muted-foreground">{active ? 'Already added' : result.description}</span></span></button>;
          })}</div>}
          {selected.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1 border-t border-border px-1.5 pt-2">{selected.map((area) => <span key={area.id} className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-emerald-500/10 py-0.5 pl-2 pr-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"><MapPin className="size-2.5 shrink-0" aria-hidden="true" /><span className="truncate">{area.label}</span><button type="button" onClick={() => setSelected((current) => current.filter((item) => item.id !== area.id))} aria-label={`Remove ${area.label}`} className="grid size-4 shrink-0 place-items-center rounded-full hover:bg-emerald-500/15"><X className="size-2.5" aria-hidden="true" /></button></span>)}</div>}
          {mappedArea && <div className="mt-2 hidden overflow-hidden rounded-lg border border-border sm:block"><iframe title={`Map of ${mappedArea.label}`} src={mapUrl} loading="lazy" className="h-32 w-full border-0" /></div>}
          <p className="px-1.5 pt-1.5 text-[10px] text-muted-foreground">Map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">OpenStreetMap contributors</a></p>
        </PopoverContent>
      </Popover>
      <p className="mt-1.5 truncate text-xs text-muted-foreground">{selected.length > 0 ? selected.map((area) => area.label).join(' • ') : 'Search and select one or more areas.'}</p>
    </div>
  );
}
