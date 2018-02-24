import * as googleMaps from '@google/maps';

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
  steps: IStep[];
  start_location: ILocation;
  end_location: ILocation;
  duration: { value: number; text: string };
  distance: { value: number; text: string };
  start_address: string;
  end_address: string;
}

const mapsClient = googleMaps.createClient({
  Promise,
  key: GOOGLE_API_KEY,
});

export function getCoordsForAddress(address): Promise<ILocation> {
  return new Promise((resolve, reject) => {
    mapsClient
      .geocode({
        address
      })
      .asPromise()
      .then(response => {
        const results = response.json.results;

        if (results.length > 0) {
          const result = results[0];

          resolve(result.geometry.location);
        } else {
          reject("Could not resolve address.");
        }
      });
  });
}

export async function getDirections(origin, destination, mode): Promise<ILeg> {
  const directions = await mapsClient
    .directions({
      destination,
      mode,
      origin
    })
    .asPromise();

  if (directions.json.routes.length > 0) {
    const route = directions.json.routes[0];
    return route.legs[0];
  } else {
    throw new Error("Could not calculate directions.");
  }
}
