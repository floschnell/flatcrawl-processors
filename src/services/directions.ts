import * as rp from 'request-promise';
import { IGeo } from '../models/location';

export interface IStep {
  travel_mode: string;
  start_location: IGeo;
  end_location: IGeo;
  duration: { value: number; text: string };
  distance: { value: number; text: string };
}

export interface ILeg {
  duration: { value: number; text: string };
  distance: { value: number; text: string };
}

const addressCache = new Map<string, IGeo>();

export async function getCoordsForAddress(address): Promise<IGeo> {
  if (addressCache.has(address)) {
    console.log("used address", address, "from cache.");
    return addressCache.get(address);
  } else {
    console.log("requesting", address, "from nominatim ...");
    const options = {
      uri: `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json`,
      headers: {
        'User-Agent': 'FlatCrawl (floschnell@gmail.com)'
      },
      json: true,
    };
    const results = await rp(options);
    if (results.length > 0) {
      const location = {
        lat: results[0].lat,
        lng: results[0].lon,
      };
      console.log("address", address, "has been resolved to", location);
      addressCache.set(address, location);
      return location;
    } else {
      console.log("address", address, "could not be resolved!");
      return null;
    }
  }
}

export async function getDirections(origin: IGeo, destination: IGeo, mode): Promise<ILeg> {
  const transport = {
    "walking": "foot",
    "driving": "car",
    "bicycling": "bicycle",
    "transit": "bicycle",
  }[mode];
  if (origin == null || destination == null) {
    throw new Error(`Could not calculate directions from ${JSON.stringify(origin)} to ${JSON.stringify(destination)}.`);
  }
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
    throw new Error(`Could not calculate directions from ${JSON.stringify(origin)} to ${JSON.stringify(destination)}.`);
  }
}
