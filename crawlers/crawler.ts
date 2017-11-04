import * as https from 'https';
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
  public host: string;
  public path: string;
  private document: Document;

  constructor(name, inhost, inpath) {
    this.name = name;
    this.host = inhost;
    this.path = inpath;
  }

  public async run() {
    const document = await this.getHtml();
    const flats = await this.getLatestFlats(document);
    return flats;
  }

  /**
   * Gets the lates flats.
   * 
   * @memberOf Crawler
   */
  public abstract getLatestFlats(document: Document): Promise<Flat[]>;

  /**
   * Retrieves all text content below that specific element.
   * 
   * @param {HTMLElement} element
   * @param {String} selector
   * 
   * @memberOf Crawler
   */
  protected getTextSimple(element, selector) {
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
  protected getText(element, selector) {
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
            response.on('data', chunk => {
              html += chunk;
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
