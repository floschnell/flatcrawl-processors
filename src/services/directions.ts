import * as googleMaps from '@google/maps';
import * as rp from 'request-promise';

import { GOOGLE_API_KEY } from '../config';

export interface ILocation {
  lat: number;
  lng: number;
}

export interface IStep {
  travel_mode: string;
  start_location: ILocation;
  end_location: ILocation;
  duration: { value: number; text: string };
  distance: { value: number; text: string };
}

export interface ILeg {
  duration: { value: number; text: string };
  distance: { value: number; text: string };
}

const mapsClient = googleMaps.createClient({
  Promise,
  key: GOOGLE_API_KEY,
});

export async function getCoordsForAddress(address): Promise<ILocation> {
  const options = {
    uri: `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json`,
    headers: {
      'User-Agent': 'FlatCrawl (floschnell@gmail.com)'
    },
    json: true,
  };
  const results = await rp(options);
  if (results.length > 0) {
    return {
      lat: results[0].lat,
      lng: results[0].lon,
    };
  } else {
    return null;
  }
}

export async function getDirections(origin: { lat: number, lng: number }, destination: { lat: number, lng: number }, mode): Promise<ILeg> {
  const transport = {
    "walking": "foot",
    "driving": "car",
    "bicycling": "bicycle",
    "transit": "bicycle",
  }[mode];
  const response = await rp(`http://routing-${transport}:5000/route/v1/${transport}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`)
  const directions = JSON.parse(response);

  if (directions.routes.length > 0) {
    return {
      duration: {
        value: directions.routes[0].duration,
        text: Math.round(directions.routes[0].duration / 60) + " min",
      },
      distance: {
        value: directions.routes[0].distance,
        text: Math.round(directions.routes[0].distance / 1000) + " km",
      }
    };
  } else {
    throw new Error("Could not calculate directions.");
  }
}
