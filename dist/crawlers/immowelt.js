"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const flat_js_1 = require("../models/flat.js");
const crawler_js_1 = require("./crawler.js");
/**
 * ImmoWelt crawler implementation.
 *
 * @class ImmoWelt
 * @extends {Crawler}
 */
class ImmoWeltCrawler extends crawler_js_1.Crawler {
    constructor(inhost, inpath) {
        super('immowelt', inhost, inpath);
    }
    /**
     * @inheritDoc
     */
    getLatestFlats(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [...document.querySelectorAll('.js-object[data-estateid]')];
            return results.map(result => this.parseFlat(result));
        });
    }
    parseFlat(flatElement) {
        return new flat_js_1.Flat({
            address: this.getTextSimple(flatElement, '.listlocation')
                .split('\n')
                .map(part => part.trim())
                .filter(part => part.length > 0)
                .join(', '),
            date: new Date().getTime(),
            externalid: this.getAttribute(flatElement, null, 'data-estateid'),
            rent: this.getTextSimple(flatElement, '.hardfacts_3 .hardfact:nth-child(1) strong'),
            rooms: this.getTextSimple(flatElement, '.hardfacts_3 .hardfact:nth-child(3)'),
            source: this.name,
            squaremeters: this.getText(flatElement, '.hardfacts_3 .hardfact:nth-child(2)'),
            title: this.getText(flatElement, '.listcontent h2')
        });
    }
}
exports.ImmoWeltCrawler = ImmoWeltCrawler;
//# sourceMappingURL=immowelt.js.map