const Client = require('../models/client');
const Flat = require('../models/flat');
const evaluateFlat = require('../services/evaluation');
const Database = require('../data/firebase');
const Directions = require('../services/directions');
const Telegraf = require('telegraf');

const dbConnection = new Database();
const telegraf = new Telegraf('***REMOVED***');
const telegram = new Telegraf.Telegram('***REMOVED***');

const chatsToInform = [];

telegraf.command(['startUpdate'], (ctx) => {
    console.log(ctx.update.message.chat);
    chatsToInform.push(ctx.update.message.chat);
    return ctx.reply('Sure ' + ctx.update.message.chat.first_name + ', will keep you up to date!');
});

telegraf.startPolling();

dbConnection.getClients().then(clients =>
    Promise.all(
        clients.map(client =>
            Promise.all(client.locations.map(
                location => Directions.getCoordsForAddress(location.address).then(geo => {
                    location.geo = geo;
                    return location;
                })
            )).then(locations => {
                client.locations = locations;
                return client;
            })
        )
    )
).then(clients => {
    dbConnection.getNewFlats(flat =>
        clients.forEach(client => {
            if (evaluateFlat(client, flat)) {
                Directions.getCoordsForAddress(flat.address).then(flatGeo =>
                    Promise.all(
                        client.locations.map(location =>
                            Directions.getDirections(location.geo, flatGeo).then(direction => ({
                                duration: direction.duration.text,
                                distance: direction.distance.text,
                                transport: location.transport,
                                name: location.name
                            }))
                        )
                    )
                ).then(directions => {
                    chatsToInform.forEach(chat => {
                        let message = [];

                        message.push(`Hey ${chat.first_name}, found a new flat!`);
                        message.push(`It's described as "${flat.title}"`);
                        message.push(`The flat costs ${flat.rent}€ rent. It has ${flat.rooms} rooms and ${flat.squaremeters} sqm.`);

                        directions.forEach(direction => {
                            message.push(`From this flat to ${direction.name} will take you ${direction.duration} (${direction.distance}) by ${direction.transport}`);
                        });

                        message.push(`[Checkout the details here](http://www.immobilienscout24.de/expose/${flat.externalid})`);

                        telegram.sendMessage(chat.id, message.join("\n"), {parse_mode: 'Markdown'});
                    })
                })
            }
        })
    )
});