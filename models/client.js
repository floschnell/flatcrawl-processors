const Location = require('./location');

class Client {
    constructor ({limits, locations, chats}) {
        if (locations) {
            this.locations = locations.map(
                location => new Location(location)
            );
        } else {
            this.locations = [];
        }
        
        this.limits = limits || {};

        this.chats = chats || {};
    }
}

module.exports = Client;
