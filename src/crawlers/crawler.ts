import * as https from 'https';
import * as iconv from 'iconv-lite';
import * as jsdom from 'jsdom';
import { Flat } from '../models/flat';

const { JSDOM } = jsdom;

/**
 * Base class of all crawlers.
 * 
 * @class Crawler
 */
export abstract class Crawler {
  public name: string;

  private host: string;
  private path: string;
  private selector: string;
  private encoding: string;
  private document: Document;

  constructor({ name, selector, host, path, encoding = 'utf-8' }) {
    this.name = name;
    this.host = host;
    this.path = path;
    this.selector = selector;
    this.encoding = encoding;
  }

  public async run() {
    try {
      const document = await this.getHtml();
      const flats = await this.getLatestFlats(document);
      return flats;
    } catch (e) {
      console.error(`There was an exception while executing the "${this.name}" crawler:`, e);
      console.log('Will return empty list of results.');
      return [];
    }
  }

  /**
   * Gets the lates flats.
   * 
   * @memberOf Crawler
   */
  public async getLatestFlats(document: Document): Promise<Flat[]> {
    const list = [...document.querySelectorAll(this.selector)];
    const flats: Flat[] = [];

    for (const row of list) {
      try {
        flats.push(await this.parseFlat(row));
      } catch (e) {
        console.error(`Error while executing crawler "${this.name}": ${e.message}.`, e);
        console.log('Flat will not be in results.');
      }
    }

    return flats.filter(flat => flat != null);
  }

  /**
   * Takes a flat object and generates a URL to the specific flat's page.
   * 
   * @param flat The flat which we want to generate the URL for.
   */
  public abstract getURL(flat: Flat): string;

  /**
   * Takes a HTML element and converts it into a flat object.
   * 
   * @param flatElement Element within the HTML page that contains all
   * information about the flat.
   */
  protected abstract parseFlat(flatElement: Element): Promise<Flat>;

  /**
   * Retrieves all text content below that specific element.
   * 
   * @param {HTMLElement} element
   * @param {String} selector
   * 
   * @memberOf Crawler
   */
  protected getTextSimple(element, selector): string {
    if (element.querySelector(selector)) {
      return element.querySelector(selector).textContent;
    } else {
      return 'not_found';
    }
  }

  /**
   * Retrieves only the text content that belongs to the specific element.
   * 
   * @param {HTMLElement} element
   * @param {String} selector
   * 
   * @memberOf Crawler
   */
  protected getText(element, selector): string {
    const selectedElement = element.querySelector(selector);
    const children = [...selectedElement.childNodes];

    return children
      .map(
      child =>
        child.nodeValue ? child.nodeValue.replace('\n', '').trim() : ''
      )
      .reduce((a, b) => a + b);
  }

  /**
   * 
   * @param {HTMLElement} element
   * @param {String} selector
   * @param {String} attribute
   * @returns
   * 
   * @memberOf Crawler
   */
  protected getAttribute(element, selector, attribute) {
    const selectedElement = selector
      ? element.querySelector(selector)
      : element;

    return selectedElement.getAttribute(attribute);
  }

  /**
   * Gets the window object for the page that we want to crawl.
   * 
   * @returns {PromiseLike.<Window>}
   * 
   * @memberOf Crawler
   */
  private getHtml(): Promise<Document> {
    return new Promise((resolve, reject) => {
      https
        .request(
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.100 Safari/537.36'
          },
          host: this.host,
          path: this.path
        },
        response => {
          let html = '';
          response.on('data', (chunk: Buffer) => {
            html += iconv.decode(chunk, this.encoding);
          });
          response.on('end', () => {
            const dom = new JSDOM(html);
            resolve(dom.window.document);
          });
        }
        )
        .end();
    });
  }
}