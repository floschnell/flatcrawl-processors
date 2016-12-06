const Flat = require('../models/flat');
const Client = require('../models/client');

/**
 * 
 * 
 * @param {{limits:Array<{attributeName:string,min:integer,max:integer}>,locations:Array<name:string,address:string,transport:string>}} client
 * @param {{rooms:int,squaremeters:integer}} flat
 */
function evaluateFlat(client, flat) {
    for (const attribute in client.limits) {
        const limit = client.limits[attribute];

        if (flat.hasOwnProperty(attribute)) {
            const attributeValue = flat[attribute];

            if (limit.max && attributeValue > limit.max) {
                return false;
            }

            if (limit.min && attributeValue < limit.min) {
                return false;
            }
        }
    }

    return true;
}

module.exports = evaluateFlat;
