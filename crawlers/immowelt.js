const Crawler = require('./crawler.js');
const Flat = require('../models/flat.js');

/**
 * ImmoWelt crawler implementation.
 * 
 * @class ImmoWelt
 * @extends {Crawler}
 */
class ImmoWeltCrawler extends Crawler {

    constructor(inhost, inpath) {
        super('immowelt', inhost, inpath);
    }

    _parseFlat(flatElement) {
        return new Flat({
            source: this.name,
            externalid: this.getAttribute(flatElement, null, 'data-estateid'),
            title: this.getText(flatElement, '.listcontent h2'),
            address: this.getTextSimple(flatElement, '.listlocation')
                         .split('\n')
                         .map(part => part.trim())
                         .filter(part => part.length > 0)
                         .join(', '),
            rent: this.getTextSimple(flatElement, '.hardfacts_3 .hardfact:nth-child(1) strong'),
            squaremeters: this.getText(flatElement, '.hardfacts_3 .hardfact:nth-child(2)'),
            rooms: this.getTextSimple(flatElement, '.hardfacts_3 .hardfact:nth-child(3)'),
            date: new Date().getTime()
        });
    }

    getLatestFlats() {
        return this._getHtml().then(window => new Promise(resolve => {
            const results = [...window.document.querySelectorAll('.js-object[data-estateid]')];

            resolve(results.map(result => this._parseFlat(result)));
        }));
    }
};

module.exports = ImmoWeltCrawler;