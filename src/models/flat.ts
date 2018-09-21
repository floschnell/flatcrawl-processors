import { City } from "./city";
import { IGeo } from "./location";

/**
 * This represents a flat as it will be stored in our database.
 * 
 * @class Flat
 */
export class Flat {
  public city: City;
  public source: string;
  public externalid: string;
  public title: string;
  public address: string;
  public rent: number;
  public squaremeters: number;
  public rooms: number;
  public date: Date;
  public location: IGeo;

  constructor(
    { city, source, date, data: {
      externalid,
      title,
      address,
      rent,
      squaremeters,
      rooms
    }, location = null,
    }: {
        city: string, source: string, date: number, data: {
          externalid: string,
          title: string,
          address: string,
          rent: number,
          squaremeters: number,
          rooms: number
        },
        location: {
          latitude: number,
          longitude: number,
        },
      }) {
    this.city = City[city];
    this.source = source;
    this.externalid = externalid;
    this.title = title.trim();
    this.address = address.trim();
    this.rent = rent;
    this.squaremeters = squaremeters;
    this.rooms = rooms;
    this.date = new Date(date * 1000);
    if (location != null) {
      this.location = {
        lat: location.latitude,
        lng: location.longitude,
      };
    }
  }

  public get internalId() {
    const externalId = this.externalid.split('.').join('_');

    return `${this.source}-${externalId}`;
  }
}
