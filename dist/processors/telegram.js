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
const session = require("telegraf/session");
const Telegram = require("telegraf/telegram");
const firebase_1 = require("../data/firebase");
const search_1 = require("../models/search");
const directions_1 = require("../services/directions");
const evaluation_1 = require("../services/evaluation");
const dbConnection = new firebase_1.Database();
const telegraf = new Telegraf('***REMOVED***');
const telegram = new Telegram('***REMOVED***');
function mentionSender(ctx) {
    return `[${ctx.from.first_name}](tg://user?id=${ctx.from.id})`;
}
function pause(timeInMs) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), timeInMs);
    });
}
const supportedTransportModes = [
    {
        alias: 'walking',
        name: '🏃 Walk'
    },
    {
        alias: 'bicycling',
        name: '🚴 Bike'
    },
    {
        alias: 'driving',
        name: '🚗 Car'
    },
    {
        alias: 'transit',
        name: '🚇 Public'
    }
];
const runningSince = new Date();
let lastCheck = null;
let flatsChecked = 0;
let searchesCreated = 0;
let initialized = false;
const searches = new Map();
telegraf.use(session());
const question = (ctx, forceReply = true) => ({
    reply_markup: { force_reply: forceReply, selective: forceReply },
    reply_to_message_id: ctx.message.message_id
});
telegraf.command(['search', 'search@FlatcrawlBot'], (ctx) => __awaiter(this, void 0, void 0, function* () {
    console.log('received command');
    ctx.session.intent = 'create';
    ctx.session.step = 'limit:rent';
    ctx.session.search = new search_1.Search({
        user: {
            id: ctx.from.id,
            name: ctx.from.username
        }
    });
    yield telegram.sendMessage(ctx.chat.id, 'Ok, so you are looking for a new flat?');
    yield pause(500);
    yield telegram.sendMessage(ctx.chat.id, 'First, I will collect some search criteria.');
    yield pause(500);
    yield telegram.sendMessage(ctx.chat.id, 'I need you to specify the criteria in the format "[min]-[max]". You can leave out either min or max for no limit.');
    yield pause(500);
    yield telegram.sendMessage(ctx.chat.id, `How many Euro would you like to spend per month ${mentionSender(ctx)}?`, {
        parse_mode: 'markdown',
        reply_markup: { force_reply: true, selective: true }
    });
}));
telegraf.command(['subscribe', 'subscribe@FlatcrawlBot'], (ctx) => __awaiter(this, void 0, void 0, function* () {
    const chat = ctx.chat;
    const params = ctx.message.text.split(' ');
    if (params.length > 1) {
        const searchName = params[1];
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
    }
    else {
        ctx.reply(`Please provide me the search ID that you want to subscribe to.`);
    }
}));
telegraf.command(['unsubscribe', 'unsubscribe@FlatcrawlBot'], ctx => {
    const chat = ctx.chat;
    const params = ctx.message.text.split(' ');
    if (params.length > 1) {
        const searchName = params[1];
        const searchId = ctx.from.id + '-' + searchName;
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
telegraf.command(['subscriptions', 'subscriptions@FlatcrawlBot'], ctx => {
    dbConnection.getSubscriptionsForChat(ctx.chat.id).then(subscriptions => {
        if (subscriptions) {
            const subscriptionKeys = Object.keys(subscriptions)
                .map(subscription => subscription.substr(subscription.indexOf('-') + 1))
                .map(subscription => `*${subscription}*`);
            return ctx.reply(`I am currently sending you updates in this chat for following search IDs: ${subscriptionKeys.join(', ')}`, { parse_mode: 'Markdown' });
        }
        else {
            return ctx.reply(`I am currently not sending you updates in this chat.`);
        }
    });
});
telegraf.command(['status'], (ctx) => __awaiter(this, void 0, void 0, function* () {
    yield telegram.sendMessage(ctx.chat.id, `Yup, I'm here since ${runningSince.toLocaleString()}.`);
    if (lastCheck) {
        yield telegram.sendMessage(ctx.chat.id, `I have checked the last flat on ${lastCheck.toLocaleString()}.`);
        yield telegram.sendMessage(ctx.chat.id, `I have *checked ${flatsChecked} flats* and *created ${searchesCreated} searches* since I have been called to life.`, { parse_mode: 'markdown' });
    }
    else {
        yield telegram.sendMessage(ctx.chat.id, `Haven't checked any flats so far.`);
    }
}));
telegraf.on('text', (ctx) => __awaiter(this, void 0, void 0, function* () {
    if (ctx.session.intent === 'create') {
        const step = ctx.session.step.split(':');
        const stepName = step[0];
        let msg = [];
        if (stepName === 'limit') {
            const limitName = step[1];
            const limits = ctx.message.text.match(/(\d+)?\s?-\s?(\d+)?/);
            msg = ['Thank you!'];
            // did not understand limit
            if (!limits || (limits[1] === undefined && limits[2] === undefined)) {
                yield telegram.sendMessage(ctx.chat.id, `Sorry I did not understand.`);
                yield pause(500);
                yield telegram.sendMessage(ctx.chat.id, `${mentionSender(ctx)}, please try again and make sure to use the format [min]-[max].`, {
                    parse_mode: 'markdown',
                    reply_markup: { force_reply: true, selective: true },
                    reply_to_message_id: ctx.message.message_id
                });
                // ask for next limit
            }
            else {
                const limit = {};
                if (limits[1] !== undefined) {
                    msg.push(`You specified a minimum of ${limits[1]}.`);
                    limit.min = parseInt(limits[1], 10);
                }
                if (limits[2] !== undefined) {
                    msg.push(`You specified a maximum of ${limits[2]}.`);
                    limit.max = parseInt(limits[2], 10);
                }
                ctx.session.search.limits.set(limitName, limit);
                // thank you, you specified a minimum of ... and a maximum of ...
                yield telegram.sendMessage(ctx.chat.id, msg.join('\n'), {
                    reply_to_message_id: ctx.message.message_id
                });
                yield pause(1000);
                if (limitName === 'rent') {
                    ctx.session.step = 'limit:squaremeters';
                    yield telegram.sendMessage(ctx.chat.id, `How many squaremeters would you like the flat to have ${mentionSender(ctx)}?`, {
                        parse_mode: 'markdown',
                        reply_markup: { force_reply: true, selective: true }
                    });
                }
                else if (limitName === 'squaremeters') {
                    ctx.session.step = 'limit:rooms';
                    yield telegram.sendMessage(ctx.chat.id, `How many rooms would you like the flat to have ${mentionSender(ctx)}?`, {
                        parse_mode: 'markdown',
                        reply_markup: { force_reply: true, selective: true }
                    });
                }
                else if (limitName === 'rooms') {
                    ctx.session.step = 'locations:continue';
                    yield telegram.sendMessage(ctx.chat.id, 'Alright, filters are set up ...');
                    yield pause(500);
                    yield telegram.sendMessage(ctx.chat.id, 'With every new flat that I find, I can also show you the distances to your most important locations.');
                    yield pause(500);
                    yield telegram.sendMessage(ctx.chat.id, `Do you want to add a location, ${mentionSender(ctx)}?`, {
                        parse_mode: 'markdown',
                        reply_markup: {
                            force_reply: true,
                            keyboard: [['yes', 'no']],
                            one_time_keyboard: true,
                            resize_keyboard: true,
                            selective: true
                        }
                    });
                }
            }
        }
        else if (stepName === 'locations') {
            const substep = step[1];
            if (substep === 'add') {
                const location = yield directions_1.getCoordsForAddress(ctx.message.text.trim());
                ctx.session.step = 'locations:confirm';
                ctx.session.location = {
                    geo: {
                        lat: location.lat,
                        lng: location.lng
                    }
                };
                yield ctx.replyWithLocation(location.lat, location.lng, question(ctx, false));
                yield telegram.sendMessage(ctx.chat.id, `${mentionSender(ctx)}, is this location correct?`, {
                    parse_mode: 'markdown',
                    reply_markup: {
                        keyboard: [['yes', 'no']],
                        one_time_keyboard: true,
                        resize_keyboard: true,
                        selective: true
                    }
                });
            }
            else if (substep === 'confirm') {
                const response = ctx.message.text.trim().toLowerCase();
                if (response === 'yes') {
                    ctx.session.step = 'locations:transport';
                    yield telegram.sendMessage(ctx.chat.id, `${mentionSender(ctx)}, how would you like to name this location? (eg. Work or Parents)`, {
                        parse_mode: 'markdown',
                        reply_markup: { force_reply: true, selective: true }
                    });
                }
                else if (response === 'no') {
                    ctx.session.step = 'locations:add';
                    yield telegram.sendMessage(ctx.chat.id, `Ok, ${mentionSender(ctx)}, try to send me a more accurate address.`, {
                        parse_mode: 'markdown',
                        reply_markup: { force_reply: true, selective: true }
                    });
                }
                else {
                    yield telegram.sendMessage(ctx.chat.id, `${mentionSender(ctx)}, yes or no?`, {
                        parse_mode: 'markdown',
                        reply_markup: {
                            keyboard: [['yes', 'no']],
                            one_time_keyboard: true,
                            resize_keyboard: true,
                            selective: true
                        },
                        reply_to_message_id: ctx.message.message_id
                    });
                }
            }
            else if (substep === 'transport') {
                ctx.session.location.name = ctx.message.text.trim();
                ctx.session.step = 'locations:finish';
                yield telegram.sendMessage(ctx.chat.id, `${mentionSender(ctx)}, how are you usually travelling to ${ctx
                    .session.location.name}?`, {
                    parse_mode: 'markdown',
                    reply_markup: {
                        keyboard: supportedTransportModes.map(mode => [mode.name]),
                        one_time_keyboard: true,
                        resize_keyboard: true,
                        selective: true
                    }
                });
            }
            else if (substep === 'finish') {
                const receivedMode = ctx.message.text.trim();
                const chosenMode = supportedTransportModes
                    .filter(transport => transport.name === receivedMode)
                    .map(transport => transport.alias);
                if (chosenMode.length === 0) {
                    ctx.session.step = 'locations:finish';
                    yield telegram.sendMessage(ctx.chat.id, `I do not know this mode of travelling, use the buttons to reply ...`, { reply_to_message_id: ctx.message.message_id });
                    yield pause(500);
                    yield telegram.sendMessage(ctx.chat.id, `${mentionSender(ctx)}, how do you normally travel to ${ctx.session
                        .location.name}?`, {
                        parse_mode: 'markdown',
                        reply_markup: {
                            keyboard: supportedTransportModes.map(mode => [mode.name]),
                            one_time_keyboard: true,
                            resize_keyboard: true,
                            selective: true
                        }
                    });
                }
                else {
                    ctx.session.location.transport = chosenMode[0];
                    ctx.session.search.locations.push(ctx.session.location);
                    ctx.session.step = 'locations:continue';
                    yield telegram.sendMessage(ctx.chat.id, 'I will remember this location and inform you about travelling times for each flat that I will find.');
                    yield telegram.sendMessage(ctx.chat.id, `So, ${mentionSender(ctx)}, would you like to add another location?`, {
                        parse_mode: 'markdown',
                        reply_markup: {
                            keyboard: [['yes', 'no']],
                            one_time_keyboard: true,
                            resize_keyboard: true,
                            selective: true
                        }
                    });
                }
            }
            else if (substep === 'continue') {
                const response = ctx.message.text.trim().toLowerCase();
                if (response === 'yes') {
                    ctx.session.step = 'locations:add';
                    yield telegram.sendMessage(ctx.chat.id, `Ok, ${mentionSender(ctx)}, please send me the address of the location.`, {
                        parse_mode: 'markdown',
                        reply_markup: { force_reply: true, selective: true }
                    });
                }
                else if (response === 'no') {
                    // we are done!
                    ctx.session.intent = null;
                    ctx.session.step = null;
                    const id = yield dbConnection.saveSearch(ctx.session.search);
                    if (id >= 0) {
                        yield telegram.sendMessage(ctx.chat.id, `I successfully saved your search with the id *${id}*.`, {
                            parse_mode: 'markdown',
                            reply_markup: {
                                remove_keyboard: true
                            }
                        });
                        yield pause(500);
                        yield telegram.sendMessage(ctx.chat.id, `You can now subscribe from any chat to this search.`);
                        yield pause(500);
                        yield telegram.sendMessage(ctx.chat.id, `Go to the chat of your choice and *add me to the conversation*. Then use the command \`/subscribe ${id}\` to receive messages as new flats become available.`, {
                            parse_mode: 'markdown'
                        });
                    }
                    else {
                        yield telegram.sendMessage(ctx.chat.id, `Oh no, I messed up your search. Please try again later ...`, {
                            reply_markup: {
                                remove_keyboard: true
                            }
                        });
                    }
                }
                else {
                    yield telegram.sendMessage(ctx.chat.id, `Sorry ${mentionSender(ctx)}, I did not understand. Yes or no?`, {
                        parse_mode: 'markdown',
                        reply_markup: {
                            keyboard: [['yes', 'no']],
                            one_time_keyboard: true,
                            resize_keyboard: true,
                            selective: true
                        },
                        reply_to_message_id: ctx.message.message_id
                    });
                }
            }
        }
    }
}));
telegraf.startPolling();
function calculateDirections(search, flat) {
    return directions_1.getCoordsForAddress(flat.address).then(flatGeo => Promise.all(search.locations.map((location) => __awaiter(this, void 0, void 0, function* () {
        return ({
            leg: yield directions_1.getDirections(location.geo, flatGeo, location.transport),
            targetName: location.name,
            transport: location.transport
        });
    }))));
}
function sendFlatToChat(flat, directions, chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = [];
        let url = '';
        const chat = yield telegram.getChat(chatId);
        const salution = chat.first_name ? chat.first_name : 'guys';
        console.log('sending message to chat', chatId);
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
            message.push(`From this flat to *${direction.targetName}* will take you *${direction
                .leg.duration.text}* (${direction.leg.distance
                .text}) by ${direction.transport}.`);
        });
        telegram.sendMessage(chat.id, message.join('\n'), {
            parse_mode: 'Markdown'
        });
    });
}
function checkSearch(search, flat) {
    return __awaiter(this, void 0, void 0, function* () {
        const hasActiveChats = (inSearch) => {
            let hasActive = false;
            inSearch.chats.forEach(active => {
                if (active) {
                    hasActive = true;
                }
            });
            return hasActive;
        };
        if (hasActiveChats(search) && evaluation_1.evaluateFlat(search, flat)) {
            console.log('found relevant flat for search', search.user.id, search.user.name, '- calculating directions ...');
            const directions = yield calculateDirections(search, flat);
            console.log('done.');
            console.log('sending info message to chats now!');
            search.chats.forEach((enabled, chatId) => __awaiter(this, void 0, void 0, function* () {
                if (enabled) {
                    try {
                        yield sendFlatToChat(flat, directions, chatId);
                    }
                    catch (e) {
                        console.error('could not send flat to chat, because:', e);
                    }
                }
            }));
        }
        lastCheck = new Date();
    });
}
dbConnection.onFlatAdded.subscribe(event => {
    if (initialized) {
        flatsChecked++;
        searches.forEach(search => {
            checkSearch(search, event.flat);
        });
    }
});
dbConnection.onSearchAdded.subscribe(event => {
    if (initialized) {
        searchesCreated++;
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
