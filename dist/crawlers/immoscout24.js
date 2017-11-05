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
 * ImmoScout24 crawler implementation.
 *
 * @class ImmoScout24Crawler
 * @extends {Crawler}
 */
class ImmoScout24Crawler extends crawler_js_1.Crawler {
    constructor(inhost, inpath) {
        super('immoscout', inhost, inpath);
    }
    /**
     * @inheritDoc
     */
    getLatestFlats(document) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [...document.querySelectorAll('article[data-item=result]')];
            return results.map(result => this.parseFlat(result));
        });
    }
    parseFlat(flatElement) {
        return new flat_js_1.Flat({
            source: this.name,
            externalid: this.getAttribute(flatElement, null, 'data-obid'),
            title: this.getText(flatElement, '.result-list-entry__brand-title'),
            address: this.getTextSimple(flatElement, '.result-list-entry__address a'),
            rent: this.getTextSimple(flatElement, '.result-list-entry__criteria dl:nth-child(1) dd'),
            squaremeters: this.getTextSimple(flatElement, '.result-list-entry__criteria dl:nth-child(2) dd'),
            rooms: this.getTextSimple(flatElement, '.result-list-entry__criteria dl:nth-child(3) dd'),
            date: new Date().getTime()
        });
    }
}
exports.ImmoScout24Crawler = ImmoScout24Crawler;
