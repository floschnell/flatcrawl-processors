const Client = require('../models/client');
const Flat = require('../models/flat');
const evaluateFlat = require('../services/evaluation');
const Database = require('../data/firebase');
const Directions = require('../services/directions');
const Telegraf = require('telegraf');
const { memorySession } = require('telegraf');

const dbConnection = new Database();
const telegraf = new Telegraf('***REMOVED***');
const telegram = new Telegraf.Telegram('***REMOVED***');

const supportedTransportModes = [
    {
        name: 'walk',
        alias: 'walking'
    }, {
        name: 'bike',
        alias: 'bicycling'
    }, {
        name: 'car',
        alias: 'driving'
    }, {
        name: 'public',
        alias: 'transit'
    }
];

let chatsToInform = [];
let lastCheck = 0;

telegraf.use(memorySession());

question = (ctx, force_reply = true) => ({ reply_to_message_id: ctx.message.message_id, reply_markup: {force_reply, selective: force_reply}});

telegraf.command(['search'], ctx => {
    ctx.session.intent = 'create';
    ctx.session.step = 'limit:rent';
    ctx.session.search = {
        limits: {},
        locations: [],
        chats: []
    };
    return ctx.reply('So you are looking for a new flat?', question(ctx, false)).then(() => 
        ctx.reply(`First, tell me about your budget. How many Euro would you like to spent per month? (eg. 0-500 or -500 for no minimum)`, question(ctx))
    );
});


telegraf.command(['subscribe'], ctx => {
    const chat = ctx.chat;
    const searchId = ctx.message.text.replace('/subscribe', '').trim();

    if (searchId.length > 0) {
        dbConnection.getClient(searchId).then(client => {
            if (client !== null) {
                client.chats[chat.id] = true;
                dbConnection.updateClient(searchId, client).then(() => {
                    return ctx.reply(`I will update you within this chat!`);
                });
            } else {
                return ctx.reply(`The search that you want to subscribe to does not exist!`);
            }
        })
    } else {
        return ctx.reply(`Please provide me the search ID that you want to subscribe to.`);
    }
});

telegraf.command(['unsubscribe'], ctx => {
    const chat = ctx.chat;
    const searchId = ctx.message.text.replace('/unsubscribe', '').trim();

    if (searchId.length > 0) {
        dbConnection.getClient(searchId).then(client => {
            if (client !== null) {
                client.chats[chat.id] = false;
                dbConnection.updateClient(searchId, client).then(() => {
                    return ctx.reply(`I will not be sending you updates within this chat anymore!`);
                });
            } else {
                return ctx.reply(`The search that you want to unsubscribe from does not exist!`);
            }
        })
    } else {
        ctx.reply(`Please provide me the search ID that you want to unsubscribe from.`);
    }
});

telegraf.on('text', ctx => {
    if (ctx.session.intent === 'create') {
        const step = ctx.session.step.split(':');
        const stepName = step[0];
        let msg = [];
        
        if (stepName === 'limit') {
            const limitName = step[1];
            const limits = ctx.message.text.match(/(\d+)?\s?-\s?(\d+)?/);
            msg = [ 'Thank you!' ];

            if (!limits || limits[1] === undefined && limits[2] === undefined) {
                return ctx.reply('Sorry, I did not understand. Please use the format "[min] - [max]".', question(ctx));
            } else {
                const limit = {};
                if (limits[1] !== undefined) {
                    msg.push(`You specified a minimum of ${limits[1]}.`);
                    limit.min = limits[1];
                }
                if (limits[2] !== undefined) {
                    msg.push(`You specified a maximum of ${limits[2]}.`);
                    limit.max = limits[2];
                }
                
                ctx.session.search.limits[limitName] = limit;
                return ctx.reply(msg.join('\n'), question(ctx, false)).then(() => {
                    if (limitName === 'rent') {
                        ctx.session.step = 'limit:squaremeters';
                        ctx.reply('How many squaremeters would you like the flat to have?', question(ctx));
                    } else if (limitName === 'squaremeters') {
                        ctx.session.step = 'limit:rooms';
                        ctx.reply('How many rooms would you want the flat to have?', question(ctx));
                    } else if (limitName === 'rooms') {
                        ctx.session.step = 'locations:continue';
                        msg = [
                            'Alright, filters are set up!',
                            'I can also show you the distances for your most important locations.',
                        ];
                        ctx.reply(msg.join(' '), question(ctx, false)).then(() =>
                            ctx.reply('Do you want to add a location right now? (yes/no)', question(ctx))
                        );
                    }
                });
            }
        } else if (stepName === 'locations') {
            const substep = step[1];

            if (substep === 'continue') {
                const response = ctx.message.text.trim().toLowerCase();

                if (response === 'yes') {
                    ctx.session.step = 'locations:add';
                    ctx.reply('Please send me the address of the location that you would like to receive the distance for.', question(ctx));
                } else if (response === 'no') {
                    ctx.session.step = 'done';
                    ctx.reply('Wonderful. I have all your details.').then(() =>
                        dbConnection.saveClient(ctx.session.search)
                    ).then(clientId => 
                        ctx.reply(`Your search ID is ${clientId}. If you want to receive updates on that search, use "/subscribe ${clientId}" in the chat of your choice.`)
                    );
                } else {
                    ctx.reply('Sorry, I did not understand. Yes or no?', question(ctx));
                }
            } else if (substep === 'add') {
                Directions.getCoordsForAddress(ctx.message.text.trim()).then(location => {
                    ctx.session.step = 'locations:confirm';
                    ctx.session.location = {
                        geo: {
                            lat: location.lat,
                            lng: location.lng
                        }
                    };
                    ctx.replyWithLocation(location.lat, location.lng, question(ctx, false)).then(() =>
                        ctx.reply('Is this address correct? (yes/no)', question(ctx))
                    )
                });
            } else if (substep === 'confirm') {
                const response = ctx.message.text.trim().toLowerCase();
                if (response === 'yes') {
                    ctx.session.step = 'locations:transport';
                    ctx.reply('How would you like to name this location? (eg. Work or Parents)', question(ctx));
                } else if (response === 'no') {
                    ctx.session.step = 'locations:add';
                    ctx.reply('Okay, then try to send me a more accurate address.', question(ctx));
                } else {
                    ctx.reply('Sorry, I did not understand. Yes or no?', question(ctx));
                }
            } else if (substep === 'transport') {
                ctx.session.location.name = ctx.message.text.trim();
                ctx.session.step = 'locations:finish';
                msg = [
                    `How are you usually travelling to ${ctx.session.location.name}.`,
                    'Supported modes of travelling are: walk, bike, public or car.'
                ];
                ctx.reply(msg.join(' '), question(ctx));
            } else if (substep === 'finish') {
                const receivedMode = ctx.message.text.trim().toLowerCase();
                const chosenMode = supportedTransportModes
                .filter(transport => transport.name === receivedMode)
                .map(transport => transport.alias);

                if (chosenMode.length === 0) {
                    ctx.session.step = 'locations:finish';
                    ctx.reply(`I do not know the mode ${receivedMode}, please choose between: ${supportedTransportModes.map(transport => transport.name).join(', ')}`, question(ctx));
                } else {
                    ctx.session.location.transport = chosenMode[0];
                    ctx.session.search.locations.push(
                        ctx.session.location
                    );
                    ctx.session.step = 'locations:continue';
                    ctx.reply('I will remember this location and inform you about travelling times for each flat that I will find.', question(ctx, false)).then(() =>
                        ctx.reply('Would you like to add another location? (yes/no)', question(ctx))
                    )
                }
            }
        }
    }
});

telegraf.command(['status'], (ctx) => {
    ctx.reply(`Yup, I'm here. I checked the last flat on ${lastCheck}`);
});

telegraf.hears(['thanks', 'thank you', 'ty'], (ctx) => {
    return ctx.reply(`You're welcome!`);
});

telegraf.startPolling();

function calculateDirections(client, flat) {
    return Directions.getCoordsForAddress(flat.address)

    .then(flatGeo =>
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
    );
}

function sendFlatToChat(flat, directions, chatId) {
    let message = [];
    let url = '';

    telegram.getChat(chatId).then(chat => {
        const salution = chat.first_name ? chat.first_name : 'guys';

        if (flat.source === 'immoscout') {
            url = `http://www.immobilienscout24.de/expose/${flat.externalid}`;
        } else if (flat.source === 'immowelt') {
            url = `https://www.immowelt.de/expose/${flat.externalid}`;
        } else if (flat.source === 'wggesucht') {
            url = `https://www.wg-gesucht.de/${flat.externalid}`;
        }

        message.push(`Hey ${salution}, found a new flat!`);
        message.push(`[${flat.title}](${url})`);
        message.push(`The flat costs *${flat.rent}€* rent. It has *${flat.rooms} rooms* and *${flat.squaremeters} sqm*.`);

        directions.forEach(direction => {
            message.push(`From this flat to *${direction.name}* will take you *${direction.duration}* (${direction.distance}) by ${direction.transport}`);
        });

        telegram.sendMessage(chat.id, message.join("\n"), {parse_mode: 'Markdown'});
    });
}

function checkClient(client, flat) {
    if (evaluateFlat(client, flat)) {
        console.log('found relevant flat for client', client.mail, '- calculating directions ...');

        calculateDirections(client, flat).then(directions => {
            console.log('done. sending info message to chats now!');

            Object.keys(client.chats).forEach(chatId => {
                if (client.chats[chatId]) {
                    sendFlatToChat(flat, directions, chatId)
                }
            });
        })
    }
}

const clients = {};

dbConnection.onNewFlat(flat =>
    Object.values(clients).forEach(client => {
        lastCheck = new Date();

        checkClient(client, flat);
    })
)

dbConnection.onNewClient((clientUID, client) => {
    clients[clientUID] = client;

    console.log('new client', clientUID, JSON.stringify(client));
    dbConnection.getLatestFlats().then(
        flats => flats.forEach(
            flat => checkClient(client, flat)
        )
    )
});

dbConnection.onClientChanged((clientUID, client) => {
    clients[clientUID] = client;

    console.log('client changed', clientUID, JSON.stringify(client));
    dbConnection.getLatestFlats().then(
        flats => flats.forEach(
            flat => checkClient(client, flat)
        )
    )
});
