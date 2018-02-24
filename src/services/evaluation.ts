import { Flat } from '../models/flat.js';
import { Search } from '../models/search.js';
import { City } from '../models/city.js';

/**
 * Checks whether a certain flat is worth sending to a client.
 * 
 * @return boolean Whether the flat satisfies the client's wishes.
 */
export function evaluateFlat(search: Search, flat: Flat): boolean {
  let satisfied = flat.city === search.city;
  console.log(`user searches in ${City[search.city]} and flat is in ${City[flat.city]}`);
  search.limits.forEach((limit, attribute) => {
    const value = parseInt(flat[attribute], 10);

    if (limit.min !== undefined && value < limit.min) {
      console.log(
        attribute,
        'not satisfied:',
        value,
        'has been smaller than',
        limit.min
      );
      satisfied = false;
    } else if (limit.max !== undefined && value > limit.max) {
      console.log(
        attribute,
        'not satisfied:',
        value,
        'has been bigger than',
        limit.max
      );
      satisfied = false;
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
  });
  return satisfied;
}
