"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const location_1 = require("./location");
class Search {
    constructor({ limits = {}, locations = [], chats = {}, user = {} }) {
        this.locations = locations.map(location => new location_1.Location(location));
        this.limits = new Map();
        Object.keys(limits).forEach(name => {
            this.limits.set(name, {
                max: limits[name].max,
                min: limits[name].min
            });
        });
        this.chats = new Map();
        Object.keys(chats).forEach(uid => {
            this.chats.set(parseInt(uid, 10), chats[uid]);
        });
        this.user = user;
    }
    toDb() {
        return {
            chats: utils_1.mapToObject(this.chats),
            limits: utils_1.mapToObject(this.limits),
            locations: this.locations,
            name: this.name,
            user: this.user
        };
    }
}
exports.Search = Search;
//# sourceMappingURL=search.js.map