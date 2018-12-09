export interface IGeo {
  lat: number;
  lng: number;
}

export class Location {
  public name: string;
  public transport: string;
  public geo: IGeo;
  public limit: number;

  constructor({ name, transport, geo: { lat, lng }, limit = null }) {
    this.name = name;
    this.transport = transport;
    this.geo = { lat, lng };
    this.limit = limit;
  }
}
