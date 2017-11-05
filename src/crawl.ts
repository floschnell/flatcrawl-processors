import { Database } from './data/firebase';
import { Flat } from './models/flat';

import { Crawler } from './crawlers/crawler';
import { ImmoScout24Crawler } from './crawlers/immoscout24';
import { ImmoWeltCrawler } from './crawlers/immowelt';
import { WGGesuchtCrawler } from './crawlers/wggesucht';

const immoScout24Crawler = new ImmoScout24Crawler(
  'www.immobilienscout24.de',
  '/Suche/S-2/P-1/Wohnung-Miete/Bayern/Muenchen?pagerReporting=true'
);

const immoWeltCrawler = new ImmoWeltCrawler(
  'www.immowelt.de',
  '/liste/muenchen/wohnungen/mieten?sort=relevanz'
);

const wgGesuchtCrawler = new WGGesuchtCrawler(
  'www.wg-gesucht.de',
  '/wohnungen-in-Muenchen.90.2.0.0.html'
);

const crawlers: Crawler[] = [
  wgGesuchtCrawler,
  immoWeltCrawler,
  immoScout24Crawler
];
const database = new Database();

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
    .then(results =>
      results.forEach(result => {
        if (result !== null) {
          console.log('Saved flat:', JSON.stringify(result));
        }
      })
    )
    .then(() => console.log('done.'));
}

/**
 * This will collect new flats and send them to the database.
 */
function run() {
  const arrayOfPromisedFlats = crawlFlats();

  Promise.all(arrayOfPromisedFlats).then(arrayOfFlats =>
    arrayOfFlats.forEach(sendFlatsToDatabase)
  );
}

// run on startup ...
run();

// after that run all 5 minutes ...
setInterval(run, 5 * 60 * 1000);
