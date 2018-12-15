import { onNewFlat } from '../data/amqp';
import { Database } from '../data/firebase';
import { Flat } from "../models/flat";
import { Search } from "../models/search";
import {
  getDirections,
  ILeg
} from '../services/directions';
import { evaluateFlat } from '../services/evaluation';

export interface IDirection {
  targetName: string;
  transport: string;
  leg: ILeg;
}

export abstract class Processor {

  public static runAll() {
    if (Processor.initialized) {
      throw new Error("Processors can only be run once!");
    }

    Processor.searches = new Map();
    Processor.initialized = false;
    Processor._searchesCreated = 0;
    Processor._runningSince = new Date();
    Processor._flatsChecked = 0;
    Processor.dbConnection = new Database();

    Processor.processors.forEach((processor) => {
      processor.onStartup(Processor.dbConnection);
    });

    Processor.dbConnection.onSearchAdded.subscribe(event => {
      if (Processor.initialized) {
        Processor._searchesCreated++;
        console.log('new search', event.searchUid, JSON.stringify(event.search));
        Processor.searches.set(event.searchUid, event.search);
      }
    });

    Processor.dbConnection.onSearchRemoved.subscribe(event => {
      if (Processor.initialized) {
        console.log(
          'removed search',
          event.searchUid,
          JSON.stringify(event.search)
        );
        Processor.searches.delete(event.searchUid);
      }
    });

    Processor.dbConnection.onSearchChanged.subscribe(event => {
      if (Processor.initialized) {
        console.log(
          'search changed',
          event.searchUid,
          JSON.stringify(event.search)
        );
        Processor.searches.set(event.searchUid, event.search);
      }
    });

    Processor.dbConnection.getSearches().then(searchesByUid => {
      Processor.searches.clear();
      searchesByUid.forEach((value, key) => {
        Processor.searches.set(key, value);
      });
      Processor.initialized = true;
      console.log('initialization finished.');
    });

    onNewFlat.subscribe(flat => {
      console.log("incoming flat:", flat);
      Processor._flatsChecked++;
      Processor.searches.forEach(search => {
        Processor.checkSearch(search, flat);
      });
    });
  }

  public static register(processor: Processor) {
    Processor.processors.push(processor);
  }

  private static searches: Map<string, Search> = null;
  private static initialized: boolean = false;
  private static processors: Processor[] = new Array();
  private static dbConnection: Database = null;
  private static _searchesCreated: number = 0;
  private static _flatsChecked: number = 0;
  private static _runningSince: Date = null;
  private static _lastCheck: Date = null;

  public static get searchesCreated() {
    return Processor._searchesCreated;
  }

  public static get flatsChecked() {
    return Processor._flatsChecked;
  }

  public static get runningSince() {
    return Processor._runningSince;
  }

  public static get lastCheck() {
    return Processor._lastCheck;
  }

  private static async checkSearch(search: Search, flat: Flat) {
    const flatIsMatch = await evaluateFlat(search, flat);
    if (flatIsMatch) {
      console.log(
        'found relevant flat for search',
        search.user.name,
        '- calculating directions ...'
      );

      let directions: IDirection[] = null;
      try {
        directions = await Processor.calculateDirections(search, flat);
      } catch (e) {
        console.error(`could not get directions for ${flat.address}:`, e);
      }
      console.log('done.');

      // notify each processor of new flat
      Processor.processors.forEach((processor) => {
        try {
          processor.onNewMatchingFlat(flat, search, directions);
        } catch (e) {
          console.warn("Error while processing a matching flat:", e);
          console.warn("Will continue with next processor.");
        }
      });
    }
    Processor._lastCheck = new Date();
  }

  private static async calculateDirections(
    search: Search,
    flat: Flat
  ): Promise<IDirection[]> {
    return Promise.all(
      search.locations.map(
        async location =>
          ({
            leg: await getDirections(location.geo, flat.location, location.transport),
            targetName: location.name,
            transport: location.transport
          }),
      )
    );
  }

  /**
   * Is called once the Processor skeleton is setup and
   * the onNewMatchingFlat method is potentially triggered.
   * 
   * @param database Shared database instance.
   */
  protected abstract onStartup(database: Database);

  /**
   * This method will be called as soon as a new flat has been found that matches the given
   * criteria from the search.
   * 
   * @param flat Flat that has just been found and matches the given criteria.
   * @param search Search that holds the criteria and that the flat has been matched agains.
   * @param directions Calculated directions from this flat to the search destinations.
   */
  protected abstract onNewMatchingFlat(flat: Flat, search: Search, directions: IDirection[]);

  /**
   * Wrapper method to insert a new search into the database.
   * The search will be immediately picked up and considered when new flats dripple in.
   * 
   * @param search The new search that should be put into the database.
   */
  protected createNewSearch(search: Search): Promise<number> {
    return Processor.dbConnection.saveSearch(search);
  }
}