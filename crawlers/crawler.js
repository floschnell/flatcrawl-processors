const https = require('https');
const jsdom = require('jsdom');

/**
 * Base class of all crawlers.
 * 
 * @class Crawler
 */
class Crawler {
    constructor(name, inhost, inpath) {
        this.name = name;
        this.host = inhost;
        this.path = inpath;

        /**
         * @type {Window}
         */
        this.window = null;
    }
    
    /**
     * Gets the window object for the page that we want to crawl.
     * 
     * @returns {PromiseLike.<Window>}
     * 
     * @memberOf Crawler
     */
    _getHtml() {
        return new Promise((resolve, reject) => {
            console.log('address: ', this.host + this.path);

            https.request({
                host: this.host,
                path: this.path,
                headers: {
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.100 Safari/537.36"
                }
            }, response => {
                let html = '';
                response.on('data', chunk => {
                    html += chunk;
                });
                response.on('end', () => {
                    jsdom.env(html, (err, window) => {
                        if (err) {
                            reject(err);
                        } else {
                            this.window = window;
                            resolve(window);
                        }
                    });
                });
            }).end();
        });
    }

    /**
     * Retrieves all text content below that specific element.
     * 
     * @param {HTMLElement} element
     * @param {String} selector
     * 
     * @memberOf Crawler
     */
    getTextSimple(element, selector) {
        return element.querySelector(selector).textContent;
    }

    /**
     * Retrieves only the text content that belongs to the specific element.
     * 
     * @param {HTMLElement} element
     * @param {String} selector
     * 
     * @memberOf Crawler
     */
    getText(element, selector) {
        const selectedElement = element.querySelector(selector);
        const children = [...selectedElement.childNodes];
        
        return children.map(
            child => child.nodeValue ? child.nodeValue.replace('\n', '').trim() : ''
        ).reduce(
            (a, b) => a + b
        );
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
    getAttribute(element, selector, attribute) {
        const selectedElement = selector ? element.querySelector(selector) : element;

        return selectedElement.getAttribute(attribute);
    }

    /**
     * Gets the lates flats.
     * 
     * @memberOf Crawler
     */
    getLatestFlats() {}
}

module.exports = Crawler;