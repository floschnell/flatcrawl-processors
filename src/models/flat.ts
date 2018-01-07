
/**
 * This represents a flat as it will be stored in our database.
 * 
 * @class Flat
 */
export class Flat {
    public source: string;
    public externalid: string;
    public title: string;
    public address: string;
    public rent: number;
    public squaremeters: number;
    public rooms: number;
    public date: Date;

    constructor({ source, date, data: { externalid, title, address, rent, squaremeters, rooms } }) {
        this.source = source;
        this.externalid = externalid;
        this.title = title.trim();
        this.address = address.trim();
        this.rent = rent;
        this.squaremeters = squaremeters;
        this.rooms = rooms;
        this.date = new Date(date * 1000);
    }

    public get internalId() {
        const externalId = this.externalid.split('.').join('_');

        return `${this.source}-${externalId}`;
    }
}
