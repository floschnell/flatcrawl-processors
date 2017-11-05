"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Checks whether a certain flat is worth sending to a client.
 *
 * @return boolean Whether the flat satisfies the client's wishes.
 */
function evaluateFlat(search, flat) {
    let satisfied = true;
    search.limits.forEach((limit, attribute) => {
        const value = parseInt(flat[attribute], 10);
        if (limit.min !== undefined && value < limit.min) {
            console.log(attribute, 'not satisfied:', value, 'has been smaller than', limit.min);
            satisfied = false;
        }
        else if (limit.max !== undefined && value > limit.max) {
            console.log(attribute, 'not satisfied:', value, 'has been bigger than', limit.max);
            satisfied = false;
        }
        else {
            console.log(attribute, 'satisfied:', value, 'is bigger than', limit.min, 'and smaller than', limit.max);
        }
    });
    return satisfied;
}
exports.evaluateFlat = evaluateFlat;
