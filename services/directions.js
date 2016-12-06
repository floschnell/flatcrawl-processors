const mapsClient = require('@google/maps').createClient({
  key: 'AIzaSyAnfiUDFBlhfDnT9viB3g4yfpk-v1-0qnE',
  Promise
});

function getCoordsForAddress(address) {
    return new Promise(resolve => {
        mapsClient.geocode({
            address
        }).asPromise().then(response => {
            const results = response.json.results;

            if (results.length > 0) {
                const result = results[0];

                resolve(result.geometry.location);
            }
        });
    });
}

function getDirections(origin, destination) {
    return new Promise(resolve => {
        mapsClient.directions({
            origin,
            destination,
            mode: 'driving'
        }).asPromise().then(response => {
            if (response.json.routes.length > 0) {
                const route = response.json.routes[0];

                resolve(route.legs[0]);
            }
        })
    });
}

module.exports = {
    getCoordsForAddress,
    getDirections
};
