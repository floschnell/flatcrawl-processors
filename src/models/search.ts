import { mapToObject } from '../utils';
import { Location } from './location';

export interface IUser {
  id: number;
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
  public chats: Map<number, boolean>;

  constructor({ limits = {}, locations = [], chats = {}, user = {} }) {
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

    this.user = user as IUser;
    this.user.name = this.user.name || null;
  }

  public toDb(): any {
    return {
      chats: mapToObject(this.chats),
      limits: mapToObject(this.limits),
      locations: this.locations,
      user: this.user
    };
  }
}
