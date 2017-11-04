"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Telegraf = require("telegraf");
const Telegram = require("telegraf/telegram");
const session = require("telegraf/session");
const firebase_1 = require("../data/firebase");
const search_1 = require("../models/search");
const Directions = require("../services/directions");
const evaluation_1 = require("../services/evaluation");
const dbConnection = new firebase_1.Database();
const telegraf = new Telegraf('***REMOVED***');
const telegram = new Telegram('***REMOVED***');
const supportedTransportModes = [
    {
        name: 'walk',
        alias: 'walking'
    },
    {
        name: 'bike',
        alias: 'bicycling'
    },
    {
        name: 'car',
        alias: 'driving'
    },
    {
        name: 'public',
        alias: 'transit'
    }
];
let lastCheck = null;
let initialized = false;
let searches = new Map();
telegraf.use(session());
const question = (ctx, force_reply = true) => ({
    reply_to_message_id: ctx.message.message_id,
    reply_markup: { force_reply, selective: force_reply }
});
telegraf.command(['search'], ctx => {
    ctx.session.intent = 'create';
    ctx.session.step = 'limit:rent';
    ctx.session.search = new search_1.Search({
        user: {
            name: ctx.from.username,
            id: ctx.from.id
        }
    });
    return ctx
        .reply('So you are looking for a new flat?', question(ctx, false))
        .then(() => ctx.reply(`First, tell me about your budget. How many Euro would you like to spent per month? (eg. "400-800" or "-1000" for no minimum)`, question(ctx)));
});
telegraf.command(['subscribe'], (ctx) => __awaiter(this, void 0, void 0, function* () {
    const chat = ctx.chat;
    const searchName = ctx.message.text.replace('/subscribe', '').trim();
    const searchId = ctx.from.id + '-' + searchName;
    const searchExists = yield dbConnection.searchExists(searchId);
    try {
        if (searchExists) {
            yield dbConnection.subscribeChatToSearch(chat.id, searchId);
            return ctx.reply(`I will update you within this chat!`);
        }
        else {
            return ctx.reply(`I do not know this search ID.`);
        }
    }
    catch (e) {
        console.error('An error occured while subscribing to a search:', e);
        return ctx.reply(`I am confused. Please try again later.`);
    }
}));
telegraf.command(['unsubscribe'], ctx => {
    const chat = ctx.chat;
    const searchId = ctx.message.text.replace('/unsubscribe', '').trim();
    if (searchId.length > 0) {
        dbConnection.searchExists(searchId).then(exists => {
            if (exists) {
                dbConnection.unsubscribeChatFromSearch(chat.id, searchId).then(() => {
                    return ctx.reply(`I will not be sending you updates within this chat anymore.`);
                });
            }
            else {
                return ctx.reply(`I do not know this search ID.`);
            }
        });
    }
    else {
        ctx.reply(`Please provide me the search ID that you want to unsubscribe from.`);
    }
});
telegraf.command(['status'], ctx => {
    if (lastCheck) {
        ctx.reply(`Yup, I'm here. I checked the last flat on ${lastCheck.toLocaleString()}`);
    }
    else {
        ctx.reply(`Yup, I'm here. Haven't found any flats yet ...`);
    }
});
telegraf.command(['subscriptions'], ctx => {
    dbConnection.getSubscriptionsForChat(ctx.chat.id).then(subscriptions => {
        if (subscriptions) {
            const subscriptionKeys = Object.keys(subscriptions).map(subscription => `*${subscription}*`);
            return ctx.reply(`I am currently sending you updates in this chat for following search IDs: ${subscriptionKeys.join(', ')}`, { parse_mode: 'Markdown' });
        }
        else {
            return ctx.reply(`I am currently not sending you updates in this chat.`);
        }
    });
});
telegraf.on('text', (ctx) => __awaiter(this, void 0, void 0, function* () {
    if (ctx.session.intent === 'create') {
        const step = ctx.session.step.split(':');
        const stepName = step[0];
        let msg = [];
        if (stepName === 'limit') {
            const limitName = step[1];
            const limits = ctx.message.text.match(/(\d+)?\s?-\s?(\d+)?/);
            msg = ['Thank you!'];
            if (!limits || (limits[1] === undefined && limits[2] === undefined)) {
                return ctx.reply('Sorry, I did not understand. Please use the format "[min] - [max]".', question(ctx));
            }
            else {
                const limit = {};
                if (limits[1] !== undefined) {
                    msg.push(`You specified a minimum of ${limits[1]}.`);
                    limit['min'] = limits[1];
                }
                if (limits[2] !== undefined) {
                    msg.push(`You specified a maximum of ${limits[2]}.`);
                    limit['max'] = limits[2];
                }
                ctx.session.search.limits[limitName] = limit;
                return ctx.reply(msg.join('\n'), question(ctx, false)).then(() => {
                    if (limitName === 'rent') {
                        ctx.session.step = 'limit:squaremeters';
                        ctx.reply('How many squaremeters would you like the flat to have?', question(ctx));
                    }
                    else if (limitName === 'squaremeters') {
                        ctx.session.step = 'limit:rooms';
                        ctx.reply('How many rooms would you want the flat to have?', question(ctx));
                    }
                    else if (limitName === 'rooms') {
                        ctx.session.step = 'locations:continue';
                        msg = [
                            'Alright, filters are set up!',
                            'I can also show you the distances for your most important locations.'
                        ];
                        ctx
                            .reply(msg.join(' '), question(ctx, false))
                            .then(() => ctx.reply('Do you want to add a location right now? (yes/no)', question(ctx)));
                    }
                });
            }
        }
        else if (stepName === 'locations') {
            const substep = step[1];
            if (substep === 'continue') {
                const response = ctx.message.text.trim().toLowerCase();
                if (response === 'yes') {
                    ctx.session.step = 'locations:add';
                    ctx.reply('Please send me the address of the location that you would like to receive the distance for.', question(ctx));
                }
                else if (response === 'no') {
                    ctx.session.step = 'finishing';
                    ctx.reply('Finally your search will need a name (one word). The name is used to reference this search from further commands.');
                    ctx.reply('What name would you like?', question(ctx));
                }
                else {
                    ctx.reply('Sorry, I did not understand. Yes or no?', question(ctx));
                }
            }
            else if (substep === 'add') {
                Directions.getCoordsForAddress(ctx.message.text.trim()).then(location => {
                    ctx.session.step = 'locations:confirm';
                    ctx.session.location = {
                        geo: {
                            lat: location.lat,
                            lng: location.lng
                        }
                    };
                    ctx
                        .replyWithLocation(location.lat, location.lng, question(ctx, false))
                        .then(() => ctx.reply('Is this address correct? (yes/no)', question(ctx)));
                });
            }
            else if (substep === 'confirm') {
                const response = ctx.message.text.trim().toLowerCase();
                if (response === 'yes') {
                    ctx.session.step = 'locations:transport';
                    ctx.reply('How would you like to name this location? (eg. Work or Parents)', question(ctx));
                }
                else if (response === 'no') {
                    ctx.session.step = 'locations:add';
                    ctx.reply('Okay, then try to send me a more accurate address.', question(ctx));
                }
                else {
                    ctx.reply('Sorry, I did not understand. Yes or no?', question(ctx));
                }
            }
            else if (substep === 'transport') {
                ctx.session.location.name = ctx.message.text.trim();
                ctx.session.step = 'locations:finish';
                msg = [
                    `How are you usually travelling to ${ctx.session.location.name}.`,
                    'Supported modes of travelling are: walk, bike, public or car.'
                ];
                ctx.reply(msg.join(' '), question(ctx));
            }
            else if (substep === 'finish') {
                const receivedMode = ctx.message.text.trim().toLowerCase();
                const chosenMode = supportedTransportModes
                    .filter(transport => transport.name === receivedMode)
                    .map(transport => transport.alias);
                if (chosenMode.length === 0) {
                    ctx.session.step = 'locations:finish';
                    ctx.reply(`I do not know the mode ${receivedMode}, please choose between: ${supportedTransportModes
                        .map(transport => transport.name)
                        .join(', ')}`, question(ctx));
                }
                else {
                    ctx.session.location.transport = chosenMode[0];
                    ctx.session.search.locations.push(ctx.session.location);
                    ctx.session.step = 'locations:continue';
                    ctx
                        .reply('I will remember this location and inform you about travelling times for each flat that I will find.', question(ctx, false))
                        .then(() => ctx.reply('Would you like to add another location? (yes/no)', question(ctx)));
                }
            }
        }
        else if (stepName === 'finishing') {
            const searchName = ctx.message.text.trim().toLowerCase();
            if (searchName.indexOf(' ') < 0) {
                const searchId = ctx.session.search.user.id + '-' + searchName;
                ctx.session.search.name = searchName;
                const result = yield dbConnection.saveSearch(searchId, ctx.session.search);
                if (result) {
                    ctx.reply(`Your search has been set up. If you want to receive updates, use "/subscribe ${searchName}" in the chat of your choice.`);
                    ctx.session.intent = null;
                    ctx.session.step = null;
                }
                else {
                    ctx.reply(`You have already created a search with the name "${searchName}". What name would you like instead?`, question(ctx));
                }
            }
            else {
                ctx.reply(`The search name "${searchName}" is invalid. What name would you like to use instead?`, question(ctx));
            }
        }
    }
}));
telegraf.startPolling();
function calculateDirections(search, flat) {
    return Directions.getCoordsForAddress(flat.address).then(flatGeo => Promise.all(search.locations.map(location => Directions.getDirections(location.geo, flatGeo, location.transport).then(direction => ({
        duration: direction.duration.text,
        distance: direction.distance.text,
        transport: location.transport,
        name: location.name
    })))));
}
function sendFlatToChat(flat, directions, chatId) {
    const message = [];
    let url = '';
    console.log('sending message to chat', chatId);
    telegram
        .getChat(chatId)
        .then(chat => {
        const salution = chat.first_name ? chat.first_name : 'guys';
        if (flat.source === 'immoscout') {
            url = `http://www.immobilienscout24.de/expose/${flat.externalid}`;
        }
        else if (flat.source === 'immowelt') {
            url = `https://www.immowelt.de/expose/${flat.externalid}`;
        }
        else if (flat.source === 'wggesucht') {
            url = `https://www.wg-gesucht.de/${flat.externalid}`;
        }
        message.push(`Hey ${salution}, found a new flat!`);
        message.push(`[${flat.title}](${url})`);
        message.push(`The flat costs *${flat.rent}€* rent. It has *${flat.rooms} rooms* and *${flat.squaremeters} sqm*.`);
        directions.forEach(direction => {
            message.push(`From this flat to *${direction.name}* will take you *${direction.duration}* (${direction.distance}) by ${direction.transport}`);
        });
        telegram.sendMessage(chat.id, message.join('\n'), {
            parse_mode: 'Markdown'
        });
    })
        .catch(e => {
        console.error(e);
    });
}
function checkSearch(search, flat) {
    return __awaiter(this, void 0, void 0, function* () {
        if (search.chats && evaluation_1.evaluateFlat(search, flat)) {
            console.log('found relevant flat for search', search.user.id, search.user.name, '- calculating directions ...');
            const directions = yield calculateDirections(search, flat);
            console.log('done.');
            console.log('sending info message to chats now!');
            Object.keys(search.chats).forEach(chatId => {
                if (search.chats[chatId]) {
                    sendFlatToChat(flat, directions, chatId);
                }
            });
        }
        lastCheck = new Date();
    });
}
dbConnection.onFlatAdded.subscribe(event => {
    if (initialized) {
        searches.forEach(search => {
            checkSearch(search, event.flat);
        });
    }
});
dbConnection.onSearchAdded.subscribe(event => {
    if (initialized) {
        console.log('new search', event.searchUid, JSON.stringify(event.search));
        dbConnection
            .getLatestFlats()
            .then(flats => flats.forEach(flat => checkSearch(event.search, flat)));
    }
});
dbConnection.onSearchRemoved.subscribe(event => {
    if (initialized) {
        console.log('removed search', event.searchUid, JSON.stringify(event.search));
        searches.delete(event.searchUid);
    }
});
dbConnection.onSearchChanged.subscribe(event => {
    if (initialized) {
        console.log('search changed', event.searchUid, JSON.stringify(event.search));
        searches.set(event.searchUid, event.search);
        dbConnection
            .getLatestFlats()
            .then(flats => flats.forEach(flat => checkSearch(event.search, flat)));
    }
});
dbConnection.getSearches().then(searchesById => {
    searches.clear();
    Object.keys(searchesById).forEach(uid => {
        searches.set(uid, searchesById[uid]);
    });
    initialized = true;
    console.log('initialization finished.');
});
//# sourceMappingURL=telegram.js.map