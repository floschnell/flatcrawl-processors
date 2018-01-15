import { mapToObject } from '../utils';
import { Location } from './location';

export interface IUser {
  id: string;
  name: string;
}

export interface ILimit {
  min: number;
  max: number;
}

export class Search {
  public user: IUser;
  public locations: Location[];
  public limits: Map<string, ILimit>;

  constructor({ limits = {}, locations = [], user = {} }) {
    this.locations = locations.map(location => new Location(location));

    this.limits = new Map();
    Object.keys(limits).forEach(name => {
      this.limits.set(name, {
        max: limits[name].max,
        min: limits[name].min
      });
    });

    this.user = user as IUser;
    this.user.name = this.user.name || null;
  }

  public toDb(): any {
    return {
      limits: mapToObject(this.limits),
      locations: this.locations,
      user: this.user
    };
  }
}
