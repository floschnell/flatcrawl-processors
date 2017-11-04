interface IGeo {
  lat: number;
  lng: number;
}

export class Location {
  public name: string;
  public transport: string;
  public geo: IGeo;

  constructor({ name, transport, geo: { lat, lng } }) {
    this.name = name;
    this.transport = transport;
    this.geo = { lat, lng };
  }
}
