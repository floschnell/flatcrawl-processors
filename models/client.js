const Location = require('./location');

class Client {
    constructor ({mail, limits, locations}) {
        this.mail = mail;
        this.locations = locations.map(location => new Location(location));
        this.limits = limits;
    }
}

module.exports = Client;
