const Crawler = require('./crawler.js');
const Flat = require('../models/flat.js');

/**
 * ImmoScout24 crawler implementation.
 * 
 * @class ImmoScout24
 * @extends {Crawler}
 */
class ImmoScout24 extends Crawler {

    constructor(inhost, inpath) {
        super(inhost, inpath);
    }

    _parseFlat(flatElement) {
        return new Flat({
            externalid: this.getAttribute(flatElement, null, 'data-obid'),
            title: this.getText(flatElement, '.result-list-entry__brand-title'),
            address: this.getTextSimple(flatElement, '.result-list-entry__address > span'),
            rent: this.getTextSimple(flatElement, '.result-list-entry__criteria dl:nth-child(1) dd'),
            squaremeters: this.getTextSimple(flatElement, '.result-list-entry__criteria dl:nth-child(2) dd'),
            rooms: this.getTextSimple(flatElement, '.result-list-entry__criteria dl:nth-child(3) dd')
        });
    }

    getLatestFlats() {
        return this._getHtml().then(window => new Promise(resolve => {
            const results = [...window.document.querySelectorAll('article[data-item=result]')];

            resolve(results.map(result => this._parseFlat(result)));
        }));
    }
};

module.exports = ImmoScout24;