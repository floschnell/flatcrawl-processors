import { Flat } from '../models/flat.js';
import { Search } from '../models/search.js';
import { City } from '../models/city.js';
import { getDirections } from './directions.js';

/**
 * Checks whether a certain flat is worth sending to a client.
 * 
 * @return boolean Whether the flat satisfies the client's wishes.
 */
export async function evaluateFlat(search: Search, flat: Flat): Promise<boolean> {
  if (flat.city !== search.city) {
    console.log("city NOT satisfied:", flat.city, "is not equal to", search.city);
    return false;
  }

  console.log(`user searches in ${City[search.city]} and flat is in ${City[flat.city]}`);
  for (const attribute in Array.from(search.limits)) {
    console.log("evaluating attribute", attribute);
    const limit = search.limits.get(attribute);
    const value = parseInt(flat[attribute], 10);

    if (limit.min !== undefined && value < limit.min) {
      console.log(
        attribute,
        'NOT satisfied:',
        value,
        'has been smaller than',
        limit.min
      );
      return false;
    } else if (limit.max !== undefined && value > limit.max) {
      console.log(
        attribute,
        'NOT satisfied:',
        value,
        'has been bigger than',
        limit.max
      );
      return false;
    } else {
      console.log(
        attribute,
        'satisfied:',
        value,
        'is bigger than',
        limit.min,
        'and smaller than',
        limit.max
      );
    }
  }

  if (flat.location != null) {
    const travelTimeResults = await Promise.all(search.locations.map(async location => {
      if (location.limit != null && location.limit > 0) {
        try {
          console.log("Verifying travelling time constraint for search:", search.id);
          const directions = await getDirections(flat.location, location.geo, location.transport);
          const travelTime = directions.duration.value / 60;
          if (travelTime > location.limit) {
            console.log("travel time NOT satisfied: travel time", travelTime, "is bigger than", location.limit);
            return false;
          }
        } catch (e) {
          console.error("Error while trying to validate travel time limit for flat.", e);
        }
      }
      return true;
    }));
    if (travelTimeResults.some(satisfied => !satisfied)) {
      return false;
    } else {
      console.log("travel times satisfied!");
    }
  }

  return true;
}
