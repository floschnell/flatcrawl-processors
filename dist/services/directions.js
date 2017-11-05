"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const googleMaps = require("@google/maps");
const mapsClient = googleMaps.createClient({
    Promise,
    key: 'AIzaSyAnfiUDFBlhfDnT9viB3g4yfpk-v1-0qnE'
});
function getCoordsForAddress(address) {
    return new Promise(resolve => {
        mapsClient
            .geocode({
            address
        })
            .asPromise()
            .then(response => {
            const results = response.json.results;
            if (results.length > 0) {
                const result = results[0];
                resolve(result.geometry.location);
            }
        });
    });
}
exports.getCoordsForAddress = getCoordsForAddress;
function getDirections(origin, destination, mode) {
    return new Promise(resolve => {
        mapsClient
            .directions({
            destination,
            mode,
            origin
        })
            .asPromise()
            .then(response => {
            if (response.json.routes.length > 0) {
                const route = response.json.routes[0];
                resolve(route.legs[0]);
            }
        });
    });
}
exports.getDirections = getDirections;
