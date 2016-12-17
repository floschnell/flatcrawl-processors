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

let chatsToInform = [];
let lastCheck = 0;

telegraf.use(memorySession());

question = ctx => ({ reply_to_message_id: ctx.message.message_id, reply_markup: {force_reply: true, selective: true}});

telegraf.command(['search'], ctx => {
    ctx.session.intent = 'create';
    ctx.session.step = 'budget';
    ctx.session.search = {
        limits: {},
        locations: [],
        mail: null
    };
    return ctx.reply('So you are looking for a new flat?').then(() => 
        ctx.reply(`First tell me about you budget. (In Euro min-max)`, question(ctx))
    );
});

telegraf.on('text', ctx => {
    if (ctx.session.intent === 'create') {
        if (ctx.session.step === 'budget') {
            const budgetLimits = ctx.message.text.match(/(\d+)?\s?-\s?(\d+)?/);
            const msg = [ 'OK' ];

            if (!budgetLimits || budgetLimits[1] === undefined && budgetLimits[2] === undefined) {
                return ctx.reply('Sorry, I did not understand. Please use the format [min] - [max].', question(ctx));
            } else {
                const limit = {};
                if (budgetLimits[1] !== undefined) {
                    msg.push(`You specified a minimum of ${budgetLimits[1]} €.`);
                    limit.min = budgetLimits[1];
                }
                if (budgetLimits[2] !== undefined) {
                    msg.push(`You specified a maximum of ${budgetLimits[2]} €.`);
                    limit.max = budgetLimits[2];
                }
                
                ctx.session.search.limits['rent'] = limit;
                return ctx.reply(msg.join('\n')).then(
                    ctx.reply('Tell me more!', question(ctx))
                );
            }
        }
    }
});

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

function sendFlatToChat(flat, directions, chat) {
    let message = [];
    let url = '';
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
}

function checkClient(client, flat) {
    if (evaluateFlat(client, flat)) {
        console.log('found relevant flat for client', client.mail, '- calculating directions ...');

        calculateDirections(client, flat).then(directions => {
            console.log('done. sending info message now!');

            chatsToInform.forEach(
                chat => sendFlatToChat(flat, directions, chat)
            );
        })
    }
}

const clients = {};

// dbConnection.onNewFlat(flat =>
//     Object.values(clients).forEach(client => {
//         lastCheck = new Date();

//         checkClient(client, flat);
//     })
// )

// dbConnection.onNewClient(clientSnapshot => {
//     const client = clientSnapshot.val();
//     const clientUID = clientSnapshot.key;
//     clients[clientUID] = client;

//     console.log('new client', clientUID, JSON.stringify(client));
//     dbConnection.getLatestFlats().then(
//         flats => flats.forEach(
//             flat => checkClient(client, flat)
//         )
//     )
// });

// dbConnection.onClientChanged(clientSnapshot => {
//     const client = clientSnapshot.val();
//     const clientUID = clientSnapshot.key;
//     clients[clientUID] = client;

//     console.log('client changed', clientUID, JSON.stringify(client));
//     dbConnection.getLatestFlats().then(
//         flats => flats.forEach(
//             flat => checkClient(client, flat)
//         )
//     )
// });
