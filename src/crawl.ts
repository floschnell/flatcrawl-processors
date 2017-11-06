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

async function crawlFlats(): Promise<Flat[][]> {
  console.log('looking for flats ...');

  const promisedFlats = await Promise.all(
    crawlers.map(crawler => crawler.run())
  );

  console.log('done.');
  return promisedFlats;
}

async function sendFlatsToDatabase(flats: Flat[]): Promise<void> {
  console.log('sending flats to database ...');

  const promisedSaves = flats.map(async flat => {
    try {
      const result = await database.saveFlat(flat);
      if (result !== null) {
        console.log('Saved new flat:', JSON.stringify(result));
      }
    } catch (e) {
      console.error();
    }
  });
  await Promise.all(promisedSaves);

  console.log('done.');
}

/**
 * This will collect new flats and send them to the database.
 */
async function run() {
  try {
    // crawl flats
    const arrayOfFlats: Flat[][] = await crawlFlats();

    // flatten array
    const flats: Flat[] = arrayOfFlats.reduce(
      (prev, current) => prev.concat(current),
      new Array<Flat>()
    );

    // save results to database
    await sendFlatsToDatabase(flats);
  } catch (e) {
    console.error(e);
  }
}

// run on startup ...
run();

// after that run all 5 minutes ...
setInterval(run, 5 * 60 * 1000);