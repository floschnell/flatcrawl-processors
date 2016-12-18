class Location {
    constructor({name, transport, geo: {lat, lng}}) {
        this.name = name;
        this.transport = transport;
        this.geo = { lat, lng };
    }
}

module.exports = Location;
