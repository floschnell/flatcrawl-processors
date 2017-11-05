"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function mapToObject(map) {
    const obj = {};
    map.forEach((value, key) => {
        Object.assign(obj, {
            [key]: value
        });
    });
    return obj;
}
exports.mapToObject = mapToObject;
