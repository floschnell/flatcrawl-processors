"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Location {
    constructor({ name, transport, geo: { lat, lng } }) {
        this.name = name;
        this.transport = transport;
        this.geo = { lat, lng };
    }
}
exports.Location = Location;
