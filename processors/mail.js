const Client = require('../models/client');
const Flat = require('../models/flat');
const evaluateFlat = require('../services/evaluation');
const Database = require('../data/firebase');

const dbConnection = new Database();
const promisedClients = dbConnection.getClients();
const promisedFlats = dbConnection.getFlats();

Promise.all([
    promisedClients,
    promisedFlats
]).then(results => {
    const [clients, flats] = results;

    clients.forEach(client => {
        const matches = flats.filter(
            flat => evaluateFlat(client, flat)
        );

        console.log('matches for client ', client.mail, ': ', matches.length);
    })
});
