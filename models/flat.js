
/**
 * This represents a flat as it will be stored in our database.
 * 
 * @class Flat
 */
class Flat {
    constructor ({source, externalid, title, address, rent, squaremeters, rooms, date}) {
        this.source = source;
        this.externalid = externalid;
        this.title = title.trim();
        this.address = address.trim();
        this.rent = rent.match(/[\d\,]/g).join('');
        this.squaremeters = squaremeters.match(/[\d\.,]/g).join('');
        this.rooms = rooms.match(/[\d,]/g).join('');
        this.date = date;
    }

    getInternalId() {
        return `${this.source}-${this.externalid}`;
    }
}

module.exports = Flat;
