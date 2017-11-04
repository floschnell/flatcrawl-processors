import { Location } from './location';

export interface IUser {
  id: number;
  name: string;
}

export class Search {
  public name: string;
  public user: IUser;
  public locations: Location[];
  public limits: object;
  public chats: object;

  constructor({ limits = {}, locations = [], chats = {}, user = {} }) {
    this.locations = locations.map(location => new Location(location));
    this.limits = limits;
    this.chats = chats;
    this.user = user as IUser;
  }
}
