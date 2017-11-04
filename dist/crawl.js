"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("./data/firebase");
const immoscout24_1 = require("./crawlers/immoscout24");
const immowelt_1 = require("./crawlers/immowelt");
const wggesucht_1 = require("./crawlers/wggesucht");
const immoScout24Crawler = new immoscout24_1.ImmoScout24Crawler('www.immobilienscout24.de', '/Suche/S-2/P-1/Wohnung-Miete/Bayern/Muenchen?pagerReporting=true');
const immoWeltCrawler = new immowelt_1.ImmoWeltCrawler('www.immowelt.de', '/liste/muenchen/wohnungen/mieten?sort=relevanz');
const wgGesuchtCrawler = new wggesucht_1.WGGesuchtCrawler('www.wg-gesucht.de', '/wohnungen-in-Muenchen.90.2.0.0.html');
const crawlers = [
    wgGesuchtCrawler,
    immoWeltCrawler,
    immoScout24Crawler
];
const database = new firebase_1.Database();
/**
 * Uses the given crawlers and looks for new flats.
 *
 * @param {Array.<Crawler>} crawlers
 * @returns {<Array.<PromiseLike.<Flat>>} A promise of an array containing the flats.
 */
function crawlFlats() {
    console.log('looking for flats ...');
    const promisedFlats = crawlers.map(crawler => crawler.run());
    console.log('done.');
    return promisedFlats;
}
/**
 * Sends new flats to the database.
 *
 * @param {Array.<Flat>} flats
 */
function sendFlatsToDatabase(flats) {
    console.log('sending flats to database ...');
    Promise.all(flats.map(flat => database.saveFlat(flat)))
        .then(results => results.forEach(result => {
        if (result !== null) {
            console.log('Saved flat:', JSON.stringify(result));
        }
    }))
        .then(() => console.log('done.'));
}
/**
 * This will collect new flats and send them to the database.
 */
function run() {
    const arrayOfPromisedFlats = crawlFlats();
    Promise.all(arrayOfPromisedFlats).then(arrayOfFlats => arrayOfFlats.forEach(sendFlatsToDatabase));
}
// run on startup ...
run();
// after that run all 5 minutes ...
setInterval(run, 5 * 60 * 1000);
//# sourceMappingURL=crawl.js.map