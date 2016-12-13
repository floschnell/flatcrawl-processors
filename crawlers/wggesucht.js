const Crawler = require('./crawler.js');
const Flat = require('../models/flat.js');

/**
 * WGGesucht crawler implementation.
 * 
 * @class WGGesuchtCrawler
 * @extends {Crawler}
 */
class WGGesuchtCrawler extends Crawler {

    constructor(inhost, inpath) {
        super('wggesucht', inhost, inpath);
    }

    _parseFlat(flatElement) {
        const limitedOnly = this.getTextSimple(flatElement, '.ang_spalte_freibis').trim().length > 0;
        if (!limitedOnly) {
            return new Flat({
                source: this.name,
                externalid: this.getAttribute(flatElement, null, 'adid'),
                title: 'Wohnung auf WG Gesucht',
                address: 'München, ' + this.getTextSimple(flatElement, '.ang_spalte_stadt').replace('\n', '').trim(),
                rent: this.getTextSimple(flatElement, '.ang_spalte_miete'),
                squaremeters: this.getTextSimple(flatElement, '.ang_spalte_groesse'),
                rooms: this.getTextSimple(flatElement, '.ang_spalte_zimmer'),
                date: new Date().getTime()
            });
        } else {
            return null;
        }
    }

    getLatestFlats() {
        return this._getHtml().then(window => new Promise(resolve => {

            const results = [...window.document.querySelectorAll('tr[adid^=wohnungen]')];

            resolve(
                results.map(result =>
                    this._parseFlat(result)
                ).filter(flat =>
                    flat !== null
                )
            );
        }));
    }
};

module.exports = WGGesuchtCrawler;