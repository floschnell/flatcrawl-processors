
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
    public date: number;

    constructor({ source, externalid, title, address, rent, squaremeters, rooms, date }) {
        this.source = source;
        this.externalid = externalid;
        this.title = title.trim();
        this.address = address.trim();
        this.rent = rent.match(/[\d\,]/g).join('');
        this.squaremeters = squaremeters.match(/[\d\.,]/g).join('');
        this.rooms = rooms.match(/[\d,]/g).join('');
        this.date = date;
    }

    public get internalId() {
        const externalId = this.externalid.split('.').join('_');

        return `${this.source}-${externalId}`;
    }
}
