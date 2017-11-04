import { Flat } from '../models/flat.js';
import { Crawler } from './crawler.js';

/**
 * ImmoWelt crawler implementation.
 * 
 * @class ImmoWelt
 * @extends {Crawler}
 */
export class ImmoWeltCrawler extends Crawler {
  constructor(inhost, inpath) {
    super('immowelt', inhost, inpath);
  }

  /**
   * @inheritDoc
   */
  public async getLatestFlats(document: Document): Promise<Flat[]> {
    const results = [...document.querySelectorAll('.js-object[data-estateid]')];

    return results.map(result => this.parseFlat(result));
  }

  private parseFlat(flatElement) {
    return new Flat({
      address: this.getTextSimple(flatElement, '.listlocation')
        .split('\n')
        .map(part => part.trim())
        .filter(part => part.length > 0)
        .join(', '),
      date: new Date().getTime(),
      externalid: this.getAttribute(flatElement, null, 'data-estateid'),
      rent: this.getTextSimple(
        flatElement,
        '.hardfacts_3 .hardfact:nth-child(1) strong'
      ),
      rooms: this.getTextSimple(
        flatElement,
        '.hardfacts_3 .hardfact:nth-child(3)'
      ),
      source: this.name,
      squaremeters: this.getText(
        flatElement,
        '.hardfacts_3 .hardfact:nth-child(2)'
      ),
      title: this.getText(flatElement, '.listcontent h2')
    });
  }
}
