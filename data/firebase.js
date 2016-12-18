const firebase = require('firebase');
const Client = require('../models/client');
const Flat = require('../models/flat');

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
        const flatsRef = this.database.ref(`flats`);

        return flatsRef.once('value').then(snapshot => {
            if (!snapshot.exists() || !snapshot.hasChild(flat.getInternalId())) {
                this.database.ref(`flats/${flat.getInternalId()}`).set(flat);
                return flat;
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

                for (const uid in clientsByUID) {
                    clientsByUID[uid] = new Client(clientsByUID[uid]);
                }
                resolve(clientsByUID);
            });
        });
    }

    /**
     * @returns {PromiseLike.<Array.{Flat}>>}
     * 
     * @memberOf Database
     */
    onNewClient(callback) {
        const clientsRef = this.database.ref('clients');
        clientsRef.on('child_added', snapshot => {
            callback(snapshot.key, new Client(snapshot.val()));
        });
    }

    /**
     * @returns {PromiseLike.<Array.{Flat}>>}
     * 
     * @memberOf Database
     */
    onClientChanged(callback) {
        const clientsRef = this.database.ref('clients');
        clientsRef.on('child_changed', snapshot => {
            callback(snapshot.key, new Client(snapshot.val()));
        });
    }

    /**
     * @returns {PromiseLike.<Array.{Flat}>>}
     * 
     * @memberOf Database
     */
    getLatestFlats() {
        return new Promise(resolve => 
            this.database.ref('flats').orderByChild('date').limitToLast(15).once('value', snapshot => {
                const flats = Object.values(snapshot.val());

                resolve(
                    flats.map(
                        flat => new Flat(flat)
                    )
                );
            })
        );
    }

    onNewFlat(callback) {
        this.database.ref('flats').orderByChild('date').limitToLast(15).on('child_added', snapshot => callback(snapshot.val()));
    }

    saveClient(client) {
        return this.database.ref('clients').push(client).then(ref =>
            ref.key
        );
    }

    getClient(clientId) {
        return this.database.ref(`clients/${clientId}`).once('value').then(snapshot => {
            if (snapshot.exists()) {
                return new Client(snapshot.val());
            } else {
                return null;
            }
        })
    }

    updateClient(clientId, client) {
        return this.database.ref(`clients/${clientId}`).set(client);
    }
}

module.exports = Database;
