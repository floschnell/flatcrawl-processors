const firebase = require('firebase');

class Database {

    constructor() {
        const config = {
            apiKey: "AIzaSyAHzVDvfCVCuvyeRikignKT2cvKo9iBtYg",
            databaseURL: "https://flatcrawl-d2d97.firebaseio.com"
        };
        const app = firebase.initializeApp(config);
        this.database = app.database();
    }

    /**
     * Writes this flat into the database.
     * 
     * @param {Flat} flat
     * 
     * @memberOf Database
     */
    saveFlat(flat) {
        console.log('saving flat', flat.externalid);

        this.database.ref(`flats/${flat.externalid}`).set(flat);
    }
}

module.exports = Database;
