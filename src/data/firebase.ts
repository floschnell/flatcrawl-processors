import * as firebase from 'firebase';
import { Flat } from '../models/flat';
import { Search } from '../models/search';

import { Observable } from 'rxjs';

enum EventType {
  ADDED,
  CHANGED,
  REMOVED
}

interface ISearchEvent {
  type: EventType;
  searchUid: string;
  search: Search;
}

interface IFlatEvent {
  type: EventType;
  flatUid: string;
  flat: Flat;
}

export class Database {
  public static isKeyValid(text) {
    return (
      typeof text === 'string' && text.length && !text.match(/[.$\[\]#\/]/)
    );
  }

  public database: firebase.database.Database;

  // search events
  private searchChangedObserver: Observable<ISearchEvent>;
  private searchAddedObserver: Observable<ISearchEvent>;
  private searchRemovedObserver: Observable<ISearchEvent>;

  // flat events
  private flatAddedObserver: Observable<IFlatEvent>;

  constructor() {
    const config = {
      apiKey: 'AIzaSyAHzVDvfCVCuvyeRikignKT2cvKo9iBtYg',
      databaseURL: 'https://flatcrawl-d2d97.firebaseio.com'
    };
    const app = firebase.initializeApp(config);
    this.database = app.database();

    this.searchChangedObserver = Observable.create(observer => {
      const searchesRef = this.database.ref('searches');
      searchesRef.on('child_changed', snapshot => {
        const search = new Search(snapshot.val());
        const event = {
          search,
          searchUid: snapshot.key,
          type: EventType.CHANGED
        } as ISearchEvent;
        observer.next(event);
      });
      return () => {
        searchesRef.off();
      };
    });

    this.searchAddedObserver = Observable.create(observer => {
      const searchesRef = this.database.ref('searches');
      searchesRef.on('child_added', snapshot => {
        const search = new Search(snapshot.val());
        const event = {
          search,
          searchUid: snapshot.key,
          type: EventType.ADDED
        } as ISearchEvent;
        observer.next(event);
      });
      return () => {
        searchesRef.off();
      };
    });

    this.searchRemovedObserver = Observable.create(observer => {
      const searchesRef = this.database.ref('searches');
      searchesRef.on('child_removed', snapshot => {
        const search = new Search(snapshot.val());
        const event = {
          search,
          searchUid: snapshot.key,
          type: EventType.REMOVED
        } as ISearchEvent;
        observer.next(event);
      });
      return () => {
        searchesRef.off();
      };
    });

    this.flatAddedObserver = Observable.create(observer => {
      const flatsRef = this.database.ref('flats');
      flatsRef
        .orderByChild('date')
        .limitToLast(15)
        .on('child_added', snapshot => {
          const flat = new Flat(snapshot.val());
          const event = {
            flat,
            flatUid: flat.internalId,
            type: EventType.ADDED
          } as IFlatEvent;
          observer.next(event);
          return () => {
            flatsRef.off();
          };
        });
    });
  }

  public get onSearchChanged(): Observable<ISearchEvent> {
    return this.searchChangedObserver;
  }

  public get onSearchAdded(): Observable<ISearchEvent> {
    return this.searchAddedObserver;
  }

  public get onSearchRemoved(): Observable<ISearchEvent> {
    return this.searchRemovedObserver;
  }

  public get onFlatAdded(): Observable<IFlatEvent> {
    return this.flatAddedObserver;
  }

  public saveFlat(flat: Flat) {
    const flatsRef = this.database.ref(`flats`);

    return flatsRef.once('value').then(snapshot => {
      if (!snapshot.exists() || !snapshot.hasChild(flat.internalId)) {
        this.database.ref(`flats/${flat.internalId}`).set(flat);
        return flat;
      }
      return null;
    });
  }

  public getSearches() {
    return new Promise(resolve => {
      const searchesRef = this.database.ref('searches');

      searchesRef.once('value', snapshot => {
        const searchesById = snapshot.val() || {};

        resolve(
          Object.keys(searchesById).map(id => new Search(searchesById[id]))
        );
      });
    });
  }

  public getLatestFlats(): Promise<Flat[]> {
    return new Promise(resolve =>
      this.database
        .ref('flats')
        .orderByChild('date')
        .limitToLast(15)
        .once('value', snapshot => {
          const flats = [];
          const flatsById = snapshot.val();
          Object.keys(flatsById).forEach(id => {
            flats.push(flatsById[id]);
          });
          resolve(flats.map(flat => new Flat(flat)));
        })
    );
  }

  public async saveSearch(search: Search): Promise<number> {
    try {
      const nextSearchId = await this.getNewUserSearchId(search.user.id);
      const searchId = `${search.user.id}-${nextSearchId}`;
      const searchRef = this.database.ref(`searches/${searchId}`);
      const searchSnapshot = await searchRef.once('value');
      if (searchSnapshot.exists()) {
        console.log('search', searchId, 'already exists!');
        return -1;
      } else {
        await searchRef.set(search.toDb());
        return nextSearchId;
      }
    } catch (e) {
      console.log('search could not be created because:', e);
      return -1;
    }
  }

  public getSearch(searchId): Promise<Search> {
    return this.database
      .ref(`searches/${searchId}`)
      .once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          return new Search(snapshot.val());
        } else {
          return null;
        }
      }) as Promise<Search>;
  }

  public updateSearch(searchId, search) {
    return this.database.ref(`searches/${searchId}`).set(search);
  }

  public searchExists(searchId): Promise<boolean> {
    return this.database
      .ref(`searches/${searchId}`)
      .once('value')
      .then((snapshot: firebase.database.DataSnapshot) =>
        snapshot.exists()
      ) as Promise<boolean>;
  }

  public subscribeChatToSearch(chatId, searchId) {
    return Promise.all([
      this.database.ref(`searches/${searchId}/chats/${chatId}`).set(true),
      this.database.ref(`chats/${chatId}/${searchId}`).set(true)
    ]);
  }

  public unsubscribeChatFromSearch(chatId, searchId) {
    return Promise.all([
      this.database.ref(`searches/${searchId}/chats/${chatId}`).set(false),
      this.database.ref(`chats/${chatId}/${searchId}`).set(false)
    ]);
  }

  public getSubscriptionsForChat(chatId) {
    return this.database
      .ref(`chats/${chatId}`)
      .orderByValue()
      .equalTo(true)
      .once('value')
      .then(snapshot => snapshot.val());
  }

  private getNewUserSearchId(userId: number): Promise<number> {
    const userRef = this.database.ref(`users/${userId}`);
    return new Promise((resolve, reject) => {
      userRef.transaction(
        current => {
          if (current === null) {
            return {
              searchCount: 1
            };
          } else {
            Object.assign(current, {
              searchCount: current.searchCount + 1
            });
            return current;
          }
        },
        (error, hasSucceeded, snapshot) => {
          if (error) {
            reject(error);
          } else if (hasSucceeded) {
            const user = snapshot.val();
            resolve(user.searchCount);
          } else {
            reject(new Error('uknown error!'));
          }
        }
      );
    });
  }
}
