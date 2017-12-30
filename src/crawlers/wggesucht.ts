import { Flat } from '../models/flat.js';
import { Crawler } from './crawler.js';

/**
 * WGGesucht crawler implementation.
 * 
 * @class WGGesuchtCrawler
 * @extends {Crawler}
 */
export class WGGesuchtCrawler extends Crawler {
  constructor(inhost, inpath) {
    super({
      host: inhost,
      name: 'wggesucht',
      path: inpath,
      selector: 'tr[adid^=wohnungen]',
    });
  }

  public getURL(flat: Flat): string {
    return `https://www.wg-gesucht.de/${flat.externalid}`;
  }

  protected parseFlat(flatElement: Element): Promise<Flat> {
    const limitedOnly =
      this.getTextSimple(flatElement, '.ang_spalte_freibis').trim().length > 0;
    if (!limitedOnly) {
      const city = this.getTextSimple(flatElement, '.ang_spalte_stadt')
        .replace('\n', '')
        .trim();
      return Promise.resolve(
        new Flat({
          address: `München, ${city}`,
          date: new Date().getTime(),
          externalid: this.getAttribute(flatElement, null, 'adid'),
          rent: this.getTextSimple(flatElement, '.ang_spalte_miete'),
          rooms: this.getTextSimple(flatElement, '.ang_spalte_zimmer'),
          source: this.name,
          squaremeters: this.getTextSimple(flatElement, '.ang_spalte_groesse'),
          title: 'Wohnung auf WG Gesucht'
        })
      );
    } else {
      return null;
    }
  }
}
