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
        const flatRef = this.database.ref(`flats/${flat.externalid}`);

        return flatRef.once('value').then(snapshot => {
            if (!snapshot.exists()) {
                this.database.ref(`flats/${flat.externalid}`).set(flat);
                return flat.externalid;
            }
            return null;
        });
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
    getLatestFlat() {
        return new Promise(resolve => {
            const flatRefs = this.database.ref('flats');

            flatRefs.limitToLast(1).once('value', snapshot => {
                const flats = snapshot.val();

                resolve(Object.values(flats)[0]);
            });
        });
    }

    getNewFlats(callback) {
        this.database.ref('flats').orderByChild('date').limitToLast(15).on('child_added', snapshot => callback(snapshot.val()));
    }
}

module.exports = Database;
