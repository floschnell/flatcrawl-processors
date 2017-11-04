import { Flat } from '../models/flat.js';
import { Crawler } from './crawler.js';

/**
 * ImmoScout24 crawler implementation.
 * 
 * @class ImmoScout24Crawler
 * @extends {Crawler}
 */
export class ImmoScout24Crawler extends Crawler {
  constructor(inhost, inpath) {
    super('immoscout', inhost, inpath);
  }

  /**
   * @inheritDoc
   */
  public async getLatestFlats(document: Document): Promise<Flat[]> {
    const results = [...document.querySelectorAll('article[data-item=result]')];

    return results.map(result => this.parseFlat(result));
  }

  private parseFlat(flatElement): Flat {
    return new Flat({
      source: this.name,
      externalid: this.getAttribute(flatElement, null, 'data-obid'),
      title: this.getText(flatElement, '.result-list-entry__brand-title'),
      address: this.getTextSimple(flatElement, '.result-list-entry__address a'),
      rent: this.getTextSimple(
        flatElement,
        '.result-list-entry__criteria dl:nth-child(1) dd'
      ),
      squaremeters: this.getTextSimple(
        flatElement,
        '.result-list-entry__criteria dl:nth-child(2) dd'
      ),
      rooms: this.getTextSimple(
        flatElement,
        '.result-list-entry__criteria dl:nth-child(3) dd'
      ),
      date: new Date().getTime()
    });
  }
}
