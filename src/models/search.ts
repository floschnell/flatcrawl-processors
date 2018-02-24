import { mapToObject } from '../utils';
import { Location } from './location';
import { City } from './city';

export interface IUser {
  id: string;
  name: string;
}

export interface ILimit {
  min: number;
  max: number;
}

export class Search {
  public id: string;
  public city: City;
  public user: IUser;
  public locations: Location[];
  public limits: Map<string, ILimit>;
  public chats: Map<number, boolean>;

  constructor({
    city, chats = {}, limits = {}, locations = [], user,
  }: {
      city: string, chats: any, limits: { [limit: string]: { min: number, max: number } },
      locations: Location[], user: IUser,
    }, id: string = null) {
    this.id = id;
    this.city = City[city];
    this.locations = locations.map(location => new Location(location));

    this.limits = new Map();
    Object.keys(limits).forEach(name => {
      this.limits.set(name, {
        max: limits[name].max,
        min: limits[name].min
      });
    });

    this.chats = new Map();
    Object.keys(chats).forEach(uid => {
      this.chats.set(parseInt(uid, 10), chats[uid]);
    });

    this.user = user;
    this.user.name = this.user.name || null;
  }

  public toDb(): any {
    return {
      city: City[this.city],
      limits: mapToObject(this.limits),
      locations: this.locations,
      user: this.user,
      chats: mapToObject(this.chats),
    };
  }
}
