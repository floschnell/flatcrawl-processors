import { Crawler } from "./crawler";
import { ImmoScout24Crawler } from "./immoscout24";
import { ImmoWeltCrawler } from "./immowelt";
import { SueddeutscheCrawler } from "./sueddeutsche";
import { WGGesuchtCrawler } from "./wggesucht";

const sueddeutscheCrawler = new SueddeutscheCrawler(
  'immobilienmarkt.sueddeutsche.de',
  '/Angebote/mieten/Wohnung-Stadt_Muenchen'
);

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

export default [
  wgGesuchtCrawler,
  immoScout24Crawler,
  immoWeltCrawler,
  sueddeutscheCrawler,
];