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
const https = require("https");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
/**
 * Base class of all crawlers.
 *
 * @class Crawler
 */
class Crawler {
    constructor(name, inhost, inpath) {
        this.name = name;
        this.host = inhost;
        this.path = inpath;
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const document = yield this.getHtml();
            const flats = yield this.getLatestFlats(document);
            return flats;
        });
    }
    /**
     * Retrieves all text content below that specific element.
     *
     * @param {HTMLElement} element
     * @param {String} selector
     *
     * @memberOf Crawler
     */
    getTextSimple(element, selector) {
        if (element.querySelector(selector)) {
            return element.querySelector(selector).textContent;
        }
        else {
            return 'not_found';
        }
    }
    /**
     * Retrieves only the text content that belongs to the specific element.
     *
     * @param {HTMLElement} element
     * @param {String} selector
     *
     * @memberOf Crawler
     */
    getText(element, selector) {
        const selectedElement = element.querySelector(selector);
        const children = [...selectedElement.childNodes];
        return children
            .map(child => child.nodeValue ? child.nodeValue.replace('\n', '').trim() : '')
            .reduce((a, b) => a + b);
    }
    /**
     *
     * @param {HTMLElement} element
     * @param {String} selector
     * @param {String} attribute
     * @returns
     *
     * @memberOf Crawler
     */
    getAttribute(element, selector, attribute) {
        const selectedElement = selector
            ? element.querySelector(selector)
            : element;
        return selectedElement.getAttribute(attribute);
    }
    /**
     * Gets the window object for the page that we want to crawl.
     *
     * @returns {PromiseLike.<Window>}
     *
     * @memberOf Crawler
     */
    getHtml() {
        return new Promise((resolve, reject) => {
            https
                .request({
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.100 Safari/537.36'
                },
                host: this.host,
                path: this.path
            }, response => {
                let html = '';
                response.on('data', chunk => {
                    html += chunk;
                });
                response.on('end', () => {
                    const dom = new JSDOM(html);
                    resolve(dom.window.document);
                });
            })
                .end();
        });
    }
}
exports.Crawler = Crawler;
