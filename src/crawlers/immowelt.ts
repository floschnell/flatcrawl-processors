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
    super({
      host: inhost,
      name: 'immowelt',
      path: inpath,
      selector: '.js-object[data-estateid]',
    });
  }

  public getURL(flat: Flat): string {
    return `https://www.immowelt.de/expose/${flat.externalid}`;
  }

  protected parseFlat(flatElement: Element): Promise<Flat> {
    return Promise.resolve(
      new Flat({
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
      })
    );
  }
}
