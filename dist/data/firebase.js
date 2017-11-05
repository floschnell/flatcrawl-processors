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
const firebase = require("firebase");
const flat_1 = require("../models/flat");
const search_1 = require("../models/search");
const rxjs_1 = require("rxjs");
var EventType;
(function (EventType) {
    EventType[EventType["ADDED"] = 0] = "ADDED";
    EventType[EventType["CHANGED"] = 1] = "CHANGED";
    EventType[EventType["REMOVED"] = 2] = "REMOVED";
})(EventType || (EventType = {}));
class Database {
    static isKeyValid(text) {
        return (typeof text === 'string' && text.length && !text.match(/[.$\[\]#\/]/));
    }
    constructor() {
        const config = {
            apiKey: 'AIzaSyAHzVDvfCVCuvyeRikignKT2cvKo9iBtYg',
            databaseURL: 'https://flatcrawl-d2d97.firebaseio.com'
        };
        const app = firebase.initializeApp(config);
        this.database = app.database();
        this.searchChangedObserver = rxjs_1.Observable.create(observer => {
            const searchesRef = this.database.ref('searches');
            searchesRef.on('child_changed', snapshot => {
                const event = {
                    search: snapshot.val(),
                    searchUid: snapshot.key,
                    type: EventType.CHANGED
                };
                observer.next(event);
            });
            return () => {
                searchesRef.off();
            };
        });
        this.searchAddedObserver = rxjs_1.Observable.create(observer => {
            const searchesRef = this.database.ref('searches');
            searchesRef.on('child_added', snapshot => {
                const event = {
                    search: snapshot.val(),
                    searchUid: snapshot.key,
                    type: EventType.ADDED
                };
                observer.next(event);
            });
            return () => {
                searchesRef.off();
            };
        });
        this.searchRemovedObserver = rxjs_1.Observable.create(observer => {
            const searchesRef = this.database.ref('searches');
            searchesRef.on('child_removed', snapshot => {
                const event = {
                    search: snapshot.val(),
                    searchUid: snapshot.key,
                    type: EventType.REMOVED
                };
                observer.next(event);
            });
            return () => {
                searchesRef.off();
            };
        });
        this.flatAddedObserver = rxjs_1.Observable.create(observer => {
            const flatsRef = this.database.ref('flats');
            flatsRef
                .orderByChild('date')
                .limitToLast(15)
                .on('child_added', snapshot => {
                const flat = new flat_1.Flat(snapshot.val());
                const event = {
                    flat,
                    flatUid: flat.internalId,
                    type: EventType.ADDED
                };
                observer.next(event);
                return () => {
                    flatsRef.off();
                };
            });
        });
    }
    get onSearchChanged() {
        return this.searchChangedObserver;
    }
    get onSearchAdded() {
        return this.searchAddedObserver;
    }
    get onSearchRemoved() {
        return this.searchRemovedObserver;
    }
    get onFlatAdded() {
        return this.flatAddedObserver;
    }
    saveFlat(flat) {
        const flatsRef = this.database.ref(`flats`);
        return flatsRef.once('value').then(snapshot => {
            if (!snapshot.exists() || !snapshot.hasChild(flat.internalId)) {
                this.database.ref(`flats/${flat.internalId}`).set(flat);
                return flat;
            }
            return null;
        });
    }
    getSearches() {
        return new Promise(resolve => {
            const searchesRef = this.database.ref('searches');
            searchesRef.once('value', snapshot => {
                const searchesById = snapshot.val() || {};
                Object.keys(searchesById).map(id => new search_1.Search(searchesById[id]));
                resolve(searchesById);
            });
        });
    }
    getLatestFlats() {
        return new Promise(resolve => this.database
            .ref('flats')
            .orderByChild('date')
            .limitToLast(15)
            .once('value', snapshot => {
            const flats = [];
            const flatsById = snapshot.val();
            Object.keys(flatsById).forEach(id => {
                flats.push(flatsById[id]);
            });
            resolve(flats.map(flat => new flat_1.Flat(flat)));
        }));
    }
    saveSearch(searchId, search) {
        return __awaiter(this, void 0, void 0, function* () {
            const searchRef = this.database.ref(`searches/${searchId}`);
            const searchSnapshot = yield searchRef.once('value');
            if (searchSnapshot.exists()) {
                console.log('search', searchId, 'already exists!');
                return false;
            }
            else {
                try {
                    yield searchRef.set(search.toDb());
                    return true;
                }
                catch (e) {
                    console.log('search could not be set because:', e);
                    return false;
                }
            }
        });
    }
    getSearch(searchId) {
        return this.database
            .ref(`searches/${searchId}`)
            .once('value')
            .then(snapshot => {
            if (snapshot.exists()) {
                return new search_1.Search(snapshot.val());
            }
            else {
                return null;
            }
        });
    }
    updateSearch(searchId, search) {
        return this.database.ref(`searches/${searchId}`).set(search);
    }
    searchExists(searchId) {
        return this.database
            .ref(`searches/${searchId}`)
            .once('value')
            .then((snapshot) => snapshot.exists());
    }
    subscribeChatToSearch(chatId, searchId) {
        return Promise.all([
            this.database.ref(`searches/${searchId}/chats/${chatId}`).set(true),
            this.database.ref(`chats/${chatId}/${searchId}`).set(true)
        ]);
    }
    unsubscribeChatFromSearch(chatId, searchId) {
        return Promise.all([
            this.database.ref(`searches/${searchId}/chats/${chatId}`).set(false),
            this.database.ref(`chats/${chatId}/${searchId}`).set(false)
        ]);
    }
    getSubscriptionsForChat(chatId) {
        return this.database
            .ref(`chats/${chatId}`)
            .orderByValue()
            .equalTo(true)
            .once('value')
            .then(snapshot => snapshot.val());
    }
}
exports.Database = Database;
//# sourceMappingURL=firebase.js.map