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
 * WGGesucht crawler implementation.
 *
 * @class WGGesuchtCrawler
 * @extends {Crawler}
 */
class WGGesuchtCrawler extends crawler_js_1.Crawler {
    constructor(inhost, inpath) {
        super('wggesucht', inhost, inpath);
    }
    /**
     * @inheritDoc
     */
    getLatestFlats(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [...document.querySelectorAll('tr[adid^=wohnungen]')];
            return results
                .map(result => this.parseFlat(result))
                .filter(flat => flat !== null);
        });
    }
    parseFlat(flatElement) {
        const limitedOnly = this.getTextSimple(flatElement, '.ang_spalte_freibis').trim().length > 0;
        if (!limitedOnly) {
            const city = this.getTextSimple(flatElement, '.ang_spalte_stadt')
                .replace('\n', '')
                .trim();
            return new flat_js_1.Flat({
                address: `München, ${city}`,
                date: new Date().getTime(),
                externalid: this.getAttribute(flatElement, null, 'adid'),
                rent: this.getTextSimple(flatElement, '.ang_spalte_miete'),
                rooms: this.getTextSimple(flatElement, '.ang_spalte_zimmer'),
                source: this.name,
                squaremeters: this.getTextSimple(flatElement, '.ang_spalte_groesse'),
                title: 'Wohnung auf WG Gesucht'
            });
        }
        else {
            return null;
        }
    }
}
exports.WGGesuchtCrawler = WGGesuchtCrawler;
//# sourceMappingURL=wggesucht.js.map