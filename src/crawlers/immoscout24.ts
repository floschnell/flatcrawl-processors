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
    super({
      host: inhost,
      name: 'immoscout',
      path: inpath,
      selector: 'article[data-item=result]',
    });
  }

  public getURL(flat: Flat): string {
    return `http://www.immobilienscout24.de/expose/${flat.externalid}`;
  }

  protected parseFlat(flatElement: Element): Promise<Flat> {
    return Promise.resolve(
      new Flat({
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
          '.result-list-entry__criteria dl:nth-child(3) dd .onlyLarge'
        ),
        date: new Date().getTime()
      })
    );
  }
}
