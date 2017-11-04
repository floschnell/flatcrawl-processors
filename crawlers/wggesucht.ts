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
    super('wggesucht', inhost, inpath);
  }

  /**
   * @inheritDoc
   */
  public async getLatestFlats(document: Document): Promise<Flat[]> {
    const results = [...document.querySelectorAll('tr[adid^=wohnungen]')];

    return results
      .map(result => this.parseFlat(result))
      .filter(flat => flat !== null);
  }

  private parseFlat(flatElement): Flat {
    const limitedOnly =
      this.getTextSimple(flatElement, '.ang_spalte_freibis').trim().length > 0;
    if (!limitedOnly) {
      const city = this.getTextSimple(flatElement, '.ang_spalte_stadt')
        .replace('\n', '')
        .trim();
      return new Flat({
        address: `München, ${city}`,
        date: new Date().getTime(),
        externalid: this.getAttribute(flatElement, null, 'adid'),
        rent: this.getTextSimple(flatElement, '.ang_spalte_miete'),
        rooms: this.getTextSimple(flatElement, '.ang_spalte_zimmer'),
        source: this.name,
        squaremeters: this.getTextSimple(flatElement, '.ang_spalte_groesse'),
        title: 'Wohnung auf WG Gesucht'
      });
    } else {
      return null;
    }
  }
}
