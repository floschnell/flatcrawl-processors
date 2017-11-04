"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const location_1 = require("./location");
class Search {
    constructor({ limits = {}, locations = [], chats = {}, user = {} }) {
        this.locations = locations.map(location => new location_1.Location(location));
        this.limits = limits;
        this.chats = chats;
        this.user = user;
    }
}
exports.Search = Search;
//# sourceMappingURL=search.js.map