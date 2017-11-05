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
let lastCheck = null;
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
    yield pause(1000);
    yield telegram.sendMessage(ctx.chat.id, 'First, I will collect some search criteria.');
    yield pause(1000);
    yield telegram.sendMessage(ctx.chat.id, 'I need you to specify the criteria in the format "[min]-[max]". You can leave out either min or max for no limit.');
    yield pause(1000);
    yield telegram.sendMessage(ctx.chat.id, `How many Euro would you like to spent per month ${mentionSender(ctx)}?`, {
        parse_mode: 'markdown',
        reply_markup: { force_reply: true, selective: true }
    });
}));
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
    const searchName = ctx.message.text.replace('/unsubscribe', '').trim();
    const searchId = ctx.from.id + '-' + searchName;
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
                // thank you, you specified a minimum of ... and a maximum of ...
                yield telegram.sendMessage(ctx.chat.id, msg.join('\n'), {
                    reply_to_message_id: ctx.message.message_id
                });
                yield pause(1000);
                ctx.session.search.limits[limitName] = limit;
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
                    yield pause(1000);
                    yield telegram.sendMessage(ctx.chat.id, 'With every new flat that I find, I can also show you the distances to your most important locations.');
                    yield pause(1000);
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
            if (substep === 'continue') {
                const response = ctx.message.text.trim().toLowerCase();
                if (response === 'yes') {
                    ctx.session.step = 'locations:add';
                    yield telegram.sendMessage(ctx.chat.id, `Ok, ${mentionSender(ctx)}, please send me the address of the location.`, {
                        parse_mode: 'markdown',
                        reply_markup: { force_reply: true, selective: true }
                    });
                }
                else if (response === 'no') {
                    ctx.session.step = 'finishing';
                    ctx.reply('Almost done. Your search will need a name (one word). The name will be used to reference this search from further commands.');
                    ctx.reply('What name would you like?', question(ctx));
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
            else if (substep === 'add') {
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
                    yield telegram.sendMessage(ctx.chat.id, `I do not know the mode "${receivedMode}" ...`, { reply_to_message_id: ctx.message.message_id });
                    yield telegram.sendMessage(ctx.chat.id, `Use the buttons, ${mentionSender(ctx)} and tell me how do you normally travel to ${ctx.session.location
                        .name}?`, {
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
        }
        else if (stepName === 'finishing') {
            const searchName = ctx.message.text.trim().toLowerCase();
            if (searchName.indexOf(' ') < 0 && firebase_1.Database.isKeyValid(searchName)) {
                const searchId = ctx.session.search.user.id + '-' + searchName;
                ctx.session.search.name = searchName;
                const result = yield dbConnection.saveSearch(searchId, ctx.session.search);
                if (result) {
                    ctx.reply(`Your search has been set up. If you want to receive updates, use "/subscribe ${searchName}" in the chat of your choice.`);
                    ctx.session.intent = null;
                    ctx.session.step = null;
                }
                else {
                    ctx.reply(`You have already created a search with the name "${searchName}".`);
                    ctx.reply('What name would you like to use instead?', question(ctx));
                }
            }
            else {
                ctx.reply(`The search name "${searchName}" is invalid. Make sure it does not contain spaces.`);
                ctx.reply('What name would you like to use instead?', question(ctx));
            }
        }
    }
}));
telegraf.startPolling();
function calculateDirections(search, flat) {
    return directions_1.getCoordsForAddress(flat.address).then(flatGeo => Promise.all(search.locations.map(location => directions_1.getDirections(location.geo, flatGeo, location.transport))));
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
            message.push(`From this flat to *${direction.end_address}* will take you *${direction
                .duration.text}* (${direction.distance.text}) by ${direction
                .steps[0].travel_mode}`);
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
            search.chats.forEach((enabled, chatId) => {
                if (enabled) {
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