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
  return new Promise(resolve => {
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
        }
      });
  });
}

export function getDirections(origin, destination, mode): Promise<ILeg> {
  return new Promise(resolve => {
    mapsClient
      .directions({
        destination,
        mode,
        origin
      })
      .asPromise()
      .then(response => {
        if (response.json.routes.length > 0) {
          const route = response.json.routes[0];

          resolve(route.legs[0] as ILeg);
        }
      });
  });
}
