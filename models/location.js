class Location {
    constructor({address, name, transport, geo: {lat, lng}}) {
        this.address = address;
        this.name = name;
        this.transport = transport;
        this.geo = { lat, lng };
    }
}

module.exports = Location;
