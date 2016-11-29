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

    /**
     * @returns {PromiseLike.<Array.{Flat}>>}
     * 
     * @memberOf Database
     */
    getClients() {
        return new Promise(resolve => {
            const clientsRef = this.database.ref('clients');

            clientsRef.once('value', snapshot => {
                const clientsByUID = snapshot.val();

                resolve(Object.values(clientsByUID));
            });
        });
    }

    /**
     * @returns {PromiseLike.<Array.{Flat}>>}
     * 
     * @memberOf Database
     */
    getFlats() {
        return new Promise(resolve => {
            const flatRefs = this.database.ref('flats');

            flatRefs.once('value', snapshot => {
                const flats = snapshot.val();

                resolve(Object.values(flats));
            });
        });
    }
}

module.exports = Database;
