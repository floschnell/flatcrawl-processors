/**
 * 
 * @class Client
 */
class Client {
    constructor ({mail, limits, location}) {
        this.mail = mail;
        this.location = location;
        this.limits = limits;
    }

    /**
     * 
     * 
     * @returns {Array.<{attributeName:string,min:number,max:number}>}
     * 
     * @memberOf Client
     */
    getLimits() {
        return this.limits;
    }
}

module.exports = Client;
