import { Crawler } from './crawlers/crawler';
import { Database } from './data/firebase';
import { Flat } from './models/flat';

import crawlers from './crawlers/index';

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
      console.error(e);
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

    console.log('flats:', JSON.stringify(flats, null, 2));

    // save results to database
    // await sendFlatsToDatabase(flats);
  } catch (e) {
    console.error(e);
  }
}

// run on startup ...
run();

// after that run all 5 minutes ...
setInterval(run, 5 * 60 * 1000);