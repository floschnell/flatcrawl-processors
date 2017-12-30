import { Flat } from '../models/flat.js';
import { Crawler } from './crawler.js';

/**
 * Sueddeutsche crawler implementation.
 * 
 * @extends {Crawler}
 */
export class SueddeutscheCrawler extends Crawler {
  constructor(inhost, inpath) {
    super({
      encoding: 'iso-8859-1',
      host: inhost,
      name: 'sueddeutsche',
      path: inpath,
      selector: '#idHitContent .hitRow',
    });
  }

  public getURL(flat: Flat): string {
    return `https://immobilienmarkt.sueddeutsche.de/Wohnungen/` +
      `mieten/Muenchen/Wohnung/${flat.externalid}?comeFromTL=1`;
  }

  protected parseFlat(flatElement: Element): Promise<Flat> {
    return Promise.resolve(
      new Flat({
        address: this.getTextSimple(flatElement, '.hitRegionTxt')
          .split("\n")[2],
        date: new Date().getTime(),
        externalid: flatElement.id
          .replace('idHitRowList', ''),
        rent: this.getTextSimple(flatElement, '.hitPrice')
          .replace("&nbsp;", " "),
        rooms: this.getTextSimple(flatElement, '.hitRoomsDiv')
          .split(', ')[1]
          .replace('.', ',')
          .replace('Zimmer', ''),
        source: this.name,
        squaremeters: this.getTextSimple(flatElement, '.hitRoomsDiv')
          .split(', ')[0]
          .replace('m²', ''),
        title: this.getTextSimple(flatElement, '.hitHeadline')
      })
    );
  }
}
