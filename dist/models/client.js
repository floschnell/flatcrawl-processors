"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const location_1 = require("./location");
class Client {
    constructor({ limits, locations, chats }) {
        if (locations) {
            this.locations = locations.map(location => new location_1.Location(location));
        }
        else {
            this.locations = [];
        }
        this.limits = limits || {};
        this.chats = chats || {};
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map