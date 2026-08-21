import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
};

export type LocationResult = {
  id: string;
  label: string;
  description: string;
  latitude: number;
  longitude: number;
};

const CACHE_SECONDS = 60 * 60 * 24 * 30;

function locationLabel(result: NominatimResult) {
  const address = result.address ?? {};
  const place = address.city || address.town || address.village || address.hamlet || address.suburb || address.county;
  const region = address.state || address.country;
  return [place, region].filter(Boolean).join(', ') || result.display_name.split(',').slice(0, 2).join(',').trim();
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ error: 'Enter at least two characters to search.' }, { status: 400 });
  }

  const cacheKey = `location-search:${createHash('sha256').update(query.toLowerCase()).digest('hex')}`;
  const cached = await redis.get<LocationResult[]>(cacheKey);
  if (cached) return NextResponse.json({ results: cached });

  const maySearch = await redis.set('location-search:rate-limit', Date.now(), { nx: true, ex: 1 });
  if (!maySearch) {
    return NextResponse.json({ error: 'Location search is busy. Try again in a moment.' }, { status: 429 });
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/search');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('addressdetails', '1');
  endpoint.searchParams.set('limit', '5');

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `Sitterfolio/1.0 (${new URL(request.url).origin})`
      }
    });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);

    const data = (await response.json()) as NominatimResult[];
    const seen = new Set<string>();
    const results = data.flatMap((result) => {
      const label = locationLabel(result);
      if (!label || seen.has(label)) return [];
      seen.add(label);
      return [{
        id: String(result.place_id),
        label,
        description: result.display_name,
        latitude: Number(result.lat),
        longitude: Number(result.lon)
      }];
    });

    await redis.set(cacheKey, results, { ex: CACHE_SECONDS });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Location search is unavailable right now. Try again shortly.' }, { status: 502 });
  }
}
