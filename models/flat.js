
/**
 * This represents a flat as it will be stored in our database.
 * 
 * @class Flat
 */
class Flat {
    constructor ({externalid, title, address, rent, squaremeters, rooms, date}) {
        this.externalid = externalid;
        this.title = title.trim();
        this.address = address.trim();
        this.rent = rent.match(/[\d\,]/g).join('');
        this.squaremeters = squaremeters.match(/[\d\.,]/g).join('');
        this.rooms = rooms.match(/[\d,]/g).join('');
        this.date = date;
    }
}

module.exports = Flat;
