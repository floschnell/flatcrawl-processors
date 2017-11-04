import { Flat } from '../models/flat.js';
import { Search } from '../models/search.js';

/**
 * Checks whether a certain flat is worth sending to a client.
 * 
 * @return boolean Whether the flat satisfies the client's wishes.
 */
export function evaluateFlat(search: Search, flat: Flat): boolean {
  return Object.keys(search.limits)
    .map(attribute => {
      const limit = search.limits[attribute];
      const value = parseInt(flat[attribute], 10);

      if (limit.min !== undefined && value < parseInt(limit.min, 10)) {
        console.log(value, 'has been smaller than', limit.min);
        return false;
      } else if (limit.max !== undefined && value > parseInt(limit.max, 10)) {
        console.log(value, 'has been bigger than', limit.max);
        return false;
      } else {
        console.log(
          value,
          'is bigger than',
          limit.min,
          'and smaller than',
          limit.max
        );
        return true;
      }
    })
    .every(result => result);
}
