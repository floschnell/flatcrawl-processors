const Client = require('../models/client');
const Flat = require('../models/flat');
const evaluateFlat = require('../services/evaluation');
const Database = require('../data/firebase');
const Directions = require('../services/directions');
const Telegraf = require('telegraf');

const dbConnection = new Database();
const telegraf = new Telegraf('***REMOVED***');
const telegram = new Telegraf.Telegram('***REMOVED***');

let chatsToInform = [];
let lastCheck = 0;

telegraf.command(['startUpdate'], (ctx) => {
    const newChat = ctx.update.message.chat;

    if (chatsToInform.some(chat => chat.id === newChat.id)) {
        console.log(`already sending updates in chat ${newChat.id}`);

        return ctx.reply(`Sure, I'm already on it 👍`);
    } else {
        console.log(`start sending updates in chat ${newChat.id} with ${newChat.first_name}`);
        chatsToInform.push(ctx.update.message.chat);

        if (newChat.first_name) {
            return ctx.reply(`Ok ${newChat.first_name}, I will keep my eyes open 🔎`);
        } else {
            return ctx.reply(`Ok, I will keep my eyes open 🔎 and report my findings here ...`);
        }
    }
});

telegraf.command(['stopUpdate'], (ctx) => {
    const chatToRemove = ctx.update.message.chat;

    console.log(`will remove chat ${chatToRemove.id} with ${chatToRemove.first_name}`);
    chatsToInform = chatsToInform.filter(
        chat => chat.id !== chatToRemove.id
    );

    return ctx.reply(`I will not be sending you new flats anymore.`);
});

telegraf.command(['status'], (ctx) => {
    ctx.reply(`Yup, I'm here. I checked the last flat on ${lastCheck}`);
});

telegraf.hears(['thanks', 'thank you', 'ty'], (ctx) => {
    return ctx.reply(`You're welcome!`);
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
            lastCheck = new Date();

            if (evaluateFlat(client, flat)) {
                Directions.getCoordsForAddress(flat.address).then(flatGeo =>
                    Promise.all(
                        client.locations.map(location =>
                            Directions.getDirections(location.geo, flatGeo, location.transport).then(direction => ({
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
                        const salution = chat.first_name ? chat.first_name : 'guys';

                        message.push(`Hey ${chat.first_name}, found a new flat!`);
                        message.push(`It's described as "${flat.title}"`);
                        message.push(`The flat costs ${flat.rent}€ rent. It has ${flat.rooms} rooms and ${flat.squaremeters} sqm.`);

                        directions.forEach(direction => {
                            message.push(`From this flat to **${direction.name}** will take you **${direction.duration}** (${direction.distance}) by ${direction.transport}`);
                        });

                        message.push(`[Checkout the details here](http://www.immobilienscout24.de/expose/${flat.externalid})`);

                        telegram.sendMessage(chat.id, message.join("\n"), {parse_mode: 'Markdown'});
                    })
                })
            }
        })
    )
});