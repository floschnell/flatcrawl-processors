import * as fs from 'fs';
import * as Telegraf from 'telegraf';
import * as session from 'telegraf/session';
import * as Telegram from 'telegraf/telegram';
import { Database } from '../data/firebase';
import { Flat } from '../models/flat';
import { ILimit, Search } from '../models/search';
import { BOT_ID, BOT_TOKEN, TEST } from '../config';
import { Processor, IDirection } from './processor';
import { getCoordsForAddress } from '../services/directions';
import { City } from '../models/city';

const tlsOptions = {
  cert: fs.readFileSync('./certs/public.pem'),
  key: fs.readFileSync('./certs/private.key'),
};

const crawlerUrls = {
  immoscout: flat => `http://www.immobilienscout24.de/expose/${flat.externalid}`,
  immowelt: flat => `https://www.immowelt.de/expose/${flat.externalid}`,
  sueddeutsche: flat => `https://immobilienmarkt.sueddeutsche.de/Wohnungen/` +
    `mieten/Muenchen/Wohnung/${flat.externalid}?comeFromTL=1`,
  wggesucht: flat => `https://www.wg-gesucht.de/${flat.externalid}`,
  wohnungsboerse: flat => `https://www.wohnungsboerse.net/immodetail/${flat.externalid}`,
}

function mentionSender(ctx) {
  return `[${ctx.from.first_name}](tg://user?id=${ctx.from.id})`;
}

function pause(timeInMs: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), timeInMs);
  });
}

function question(ctx, forceReply = true) {
  return {
    reply_markup: { force_reply: forceReply, selective: forceReply },
    reply_to_message_id: ctx.message.message_id
  };
}

const availableCities = Object.keys(City)
  .filter((key) => isNaN(Number(key)));

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
  }
];

/**
 * This processor runs a telegram bot interface.
 * People can contact it via the app and create search requests.
 * Once matching flats have been found they will immediately receive
 * text messages to the chat rooms from which they subscribed to the searches.
 */
export class TelegramProcessor extends Processor {

  private dbConnection: Database = null;
  private telegram: any = null;
  private telegraf: any = null;

  /**
   * @inheritDoc
   */
  protected onStartup(database: Database) {

    this.dbConnection = database;

    this.telegraf = new Telegraf(BOT_TOKEN);
    this.telegram = new Telegram(BOT_TOKEN);
    this.telegraf.use(session());

    // Set telegram webhook
    this.telegraf.telegram.setWebhook('https://floschnell.de:8443/telegram-webhook', {
      source: fs.readFileSync('./certs/public.pem')
    });

    // Start https webhook
    this.telegraf.startWebhook('/telegram-webhook', tlsOptions, 8443);

    // register search command
    this.telegraf.command(['search', `search@${BOT_ID}`], async ctx => {
      this.search(ctx);
    });

    // subscribes to updated of a certain search, which is given via its ID.
    this.telegraf.command(['subscribe', `subscribe@${BOT_ID}`], async ctx => {
      this.subscribe(ctx);
    });

    // unsubscribes from a certain search, which is given by its ID
    this.telegraf.command(['unsubscribe', `unsubscribe@${BOT_ID}`], ctx => {
      this.unsubscribe(ctx);
    });

    // shows all the subscriptions for a certain channel, that we get from context
    this.telegraf.command(['subscriptions', `subscriptions@${BOT_ID}`], ctx => {
      this.subscriptions(ctx);
    });

    // prints a status message: uptime and processed flats
    this.telegraf.command(['status'], async ctx => {
      this.status(ctx);
    });

    // is called once text is sent that is not a command
    // this will be the case when creating a search and we are
    // interacting with the user to guide him through the setup process
    this.telegraf.on('text', async ctx => {
      this.text(ctx);
    });
  }

  /**
   * @inheritDoc
   */
  protected onNewMatchingFlat(flat: Flat, search: Search, directions: IDirection[]) {
    console.log(`sending info message to chats from ${search.user.name}:`, search.chats);
    if (search.chats) {
      search.chats.forEach(async (enabled, chatId) => {
        if (enabled) {
          try {
            if (!TEST) {
              this.sendFlatToChat(flat, directions, chatId);
            }
          } catch (e) {
            console.error('could not send flat to chat, because:', e);
          }
        }
      });
    }
  }

  private async search(ctx: any) {
    console.log('received command');

    ctx.session.intent = 'create';
    ctx.session.step = 'city:set';
    ctx.session.search = new Search({
      user: {
        id: ctx.from.id,
        name: ctx.from.username,
      },
      city: null,
      locations: [],
      limits: {},
      chats: {},
    });
    await this.telegram.sendMessage(
      ctx.chat.id,
      'Ok, so you are looking for a new flat?',
    );
    await pause(500);
    await this.telegram.sendMessage(
      ctx.chat.id,
      'To find the perfect flat, I need to know a few more information from you.',
    );
    await pause(500);
    await this.telegram.sendMessage(
      ctx.chat.id,
      `First of all, please tell me, ${mentionSender(ctx)}, in which city are you looking for a flat?`,
      {
        parse_mode: 'markdown',
        reply_markup: {
          keyboard: availableCities.map((city) => [city]),
          one_time_keyboard: true,
          resize_keyboard: true,
          selective: true
        }
      }
    );
  }

  private async subscribe(ctx: any) {
    const chat = ctx.chat;
    const params = ctx.message.text.split(' ');

    if (params.length > 1) {
      const searchName = params[1];
      const searchId = `${ctx.from.id}-${searchName}`;
      const searchExists = await this.dbConnection.searchExists(searchId);

      try {
        if (searchExists) {
          await this.dbConnection.subscribeChatToSearch(chat.id, searchId);

          return ctx.reply(`I will update you within this chat!`);
        } else {
          return ctx.reply(`I do not know this search ID.`);
        }
      } catch (e) {
        console.error('An error occured while subscribing to a search:', e);
        return ctx.reply(`I am confused. Please try again later.`);
      }
    } else {
      const searches = await this.dbConnection.getSearchesForUser({
        id: ctx.from.id,
        name: ctx.from.username,
      });
      const unsubscribed = searches.filter(
        search => !(search.chats.has(chat.id) && search.chats.get(chat.id)),
      );
      const unsubscribedIds = unsubscribed.map(search => search.id.split("-")[1]);
      ctx.reply(`${mentionSender(ctx)}, which of your searches do you want to subscribe to?`,
        {
          parse_mode: 'markdown',
          reply_markup: {
            keyboard: unsubscribedIds.map((id) => [`/subscribe ${id}`]),
            one_time_keyboard: true,
            resize_keyboard: true,
            selective: true
          }
        });
    }
  }

  private async unsubscribe(ctx: any) {
    const chat = ctx.chat;
    const params = ctx.message.text.split(' ');

    if (params.length > 1) {
      const searchName = params[1];
      const searchId = `${ctx.from.id}-${searchName}`;

      this.dbConnection.searchExists(searchId).then(exists => {
        if (exists) {
          this.dbConnection.unsubscribeChatFromSearch(chat.id, searchId).then(() => {
            return ctx.reply(
              `I will not be sending you updates within this chat anymore.`
            );
          });
        } else {
          return ctx.reply(`I do not know this search ID.`);
        }
      });
    } else {
      const searches = await this.dbConnection.getSearchesForUser({
        id: ctx.from.id,
        name: ctx.from.username,
      });
      const subscribed = searches.filter(
        search => search.chats.has(chat.id) && search.chats.get(chat.id),
      );
      const subscribedIds = subscribed.map(search => search.id.split("-")[1]);
      ctx.reply(`${mentionSender(ctx)}, which of your subscriptions do you want to cancel?`,
        {
          parse_mode: 'markdown',
          reply_markup: {
            keyboard: subscribedIds.map((id) => [`/unsubscribe ${id}`]),
            one_time_keyboard: true,
            resize_keyboard: true,
            selective: true
          }
        });
    }
  }

  private async subscriptions(ctx: any) {
    this.dbConnection.getSubscriptionsForChat(ctx.chat.id).then(subscriptions => {
      if (subscriptions) {
        const subscriptionKeys = Object.keys(subscriptions)
          .map(subscription => subscription.substr(subscription.indexOf('-') + 1))
          .map(subscription => `*${subscription}*`);
        return ctx.reply(
          `I am currently sending you updates in this chat for following search IDs: ${subscriptionKeys.join(
            ', '
          )}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        return ctx.reply(`I am currently not sending you updates in this chat.`);
      }
    });
  }

  private async status(ctx) {
    await this.telegram.sendMessage(
      ctx.chat.id,
      `Yup, I'm here since ${Processor.runningSince.toLocaleString()}.`
    );

    if (Processor.lastCheck) {
      await this.telegram.sendMessage(
        ctx.chat.id,
        `I have checked the last flat on ${Processor.lastCheck.toLocaleString()}.`
      );

      await this.telegram.sendMessage(
        ctx.chat.id,
        `I have *checked ${Processor.flatsChecked} flats* and *created ${Processor.searchesCreated} searches* since I have been called to life.`,
        { parse_mode: 'markdown' }
      );
    } else {
      await this.telegram.sendMessage(
        ctx.chat.id,
        `Haven't checked any flats so far.`
      );
    }
  }

  private async text(ctx: any) {
    if (ctx.session.intent === 'create') {
      const step = ctx.session.step.split(':');
      const stepName = step[0];
      let msg = [];

      if (stepName === 'city') { // --- CITY ---
        const city = ctx.message.text.trim();

        if (City[city] != null) {
          ctx.session.search.city = City[city];
          await this.telegram.sendMessage(
            ctx.chat.id,
            'Next, please provide me with some limits in the format "[min]-[max]". You can leave out either min or max for no limit.'
          );
          await pause(500);
          await this.telegram.sendMessage(
            ctx.chat.id,
            `How many Euro would you like to spend per month ${mentionSender(ctx)}?`,
            {
              parse_mode: 'markdown',
              reply_markup: { force_reply: true, selective: true }
            }
          );
          ctx.session.step = 'limit:rent';
        } else { // did not understand city
          await this.telegram.sendMessage(
            ctx.chat.id,
            `Sorry ${mentionSender(ctx)}, I do not have "${city}" on my list. Please choose one of the list.`,
            {
              parse_mode: 'markdown',
              reply_markup: {
                keyboard: availableCities.map((city) => [city]),
                one_time_keyboard: true,
                resize_keyboard: true,
                selective: true,
              },
            }
          );
        }

      } else if (stepName === 'limit') { // --- LIMITS ---
        const limitName = step[1];
        const limits = ctx.message.text.match(/(\d+)?\s?-\s?(\d+)?/);
        msg = ['Thank you!'];

        // did not understand limit
        if (!limits || (limits[1] === undefined && limits[2] === undefined)) {
          await this.telegram.sendMessage(ctx.chat.id, `Sorry I did not understand.`);
          await pause(500);
          await this.telegram.sendMessage(
            ctx.chat.id,
            `${mentionSender(
              ctx
            )}, please try again and make sure to use the format [min]-[max].`,
            {
              parse_mode: 'markdown',
              reply_markup: { force_reply: true, selective: true },
              reply_to_message_id: ctx.message.message_id
            }
          );

          // ask for next limit
        } else {
          const limit = {} as ILimit;
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
          await this.telegram.sendMessage(ctx.chat.id, msg.join('\n'), {
            reply_to_message_id: ctx.message.message_id
          });

          await pause(1000);

          if (limitName === 'rent') {  // --- RENT ---
            ctx.session.step = 'limit:squaremeters';

            await this.telegram.sendMessage(
              ctx.chat.id,
              `How many squaremeters would you like the flat to have ${mentionSender(
                ctx
              )}?`,
              {
                parse_mode: 'markdown',
                reply_markup: { force_reply: true, selective: true }
              }
            );

          } else if (limitName === 'squaremeters') { // --- SQUAREMETERS ---
            ctx.session.step = 'limit:rooms';

            await this.telegram.sendMessage(
              ctx.chat.id,
              `How many rooms would you like the flat to have ${mentionSender(
                ctx
              )}?`,
              {
                parse_mode: 'markdown',
                reply_markup: { force_reply: true, selective: true }
              }
            );

          } else if (limitName === 'rooms') { // --- ROOMS ---
            ctx.session.step = 'locations:continue';

            await this.telegram.sendMessage(
              ctx.chat.id,
              'Alright, filters are set up ...'
            );

            await pause(500);

            await this.telegram.sendMessage(
              ctx.chat.id,
              'With every new flat that I find, I can also show you the distances to your most important locations.'
            );

            await pause(500);

            await this.telegram.sendMessage(
              ctx.chat.id,
              `Do you want to add a location, ${mentionSender(ctx)}?`,
              {
                parse_mode: 'markdown',
                reply_markup: {
                  force_reply: true,
                  keyboard: [['yes', 'no']],
                  one_time_keyboard: true,
                  resize_keyboard: true,
                  selective: true
                }
              }
            );
          }
        }

      } else if (stepName === 'locations') { // --- LOCATIONS ---
        const substep = step[1];

        if (substep === 'add') {
          try {
            const location = await getCoordsForAddress(ctx.message.text.trim());
            ctx.session.step = 'locations:confirm';
            ctx.session.location = {
              geo: {
                lat: location.lat,
                lng: location.lng
              }
            };
            await ctx.replyWithLocation(
              location.lat,
              location.lng,
              question(ctx, false)
            );
            await this.telegram.sendMessage(
              ctx.chat.id,
              `${mentionSender(ctx)}, is this location correct?`,
              {
                parse_mode: 'markdown',
                reply_markup: {
                  keyboard: [['yes', 'no']],
                  one_time_keyboard: true,
                  resize_keyboard: true,
                  selective: true
                }
              }
            );
          } catch (e) {
            ctx.session.step = 'locations:add';
            console.error('Could not resolve given address to pair of coordinates.');
            await this.telegram.sendMessage(
              ctx.chat.id,
              `Sorry, ${mentionSender(
                ctx
              )}, that does not seem to be a valid address. Can you be more precise please?`,
              {
                parse_mode: 'markdown',
                reply_markup: { force_reply: true, selective: true }
              }
            );
          }
        } else if (substep === 'confirm') {
          const response = ctx.message.text.trim().toLowerCase();
          if (response === 'yes') {
            ctx.session.step = 'locations:transport';

            await this.telegram.sendMessage(
              ctx.chat.id,
              `${mentionSender(
                ctx
              )}, how would you like to name this location? (eg. Work or Parents)`,
              {
                parse_mode: 'markdown',
                reply_markup: { force_reply: true, selective: true }
              }
            );
          } else if (response === 'no') {
            ctx.session.step = 'locations:add';

            await this.telegram.sendMessage(
              ctx.chat.id,
              `Ok, ${mentionSender(
                ctx
              )}, try to send me a more accurate address.`,
              {
                parse_mode: 'markdown',
                reply_markup: { force_reply: true, selective: true }
              }
            );
          } else {
            await this.telegram.sendMessage(
              ctx.chat.id,
              `${mentionSender(ctx)}, yes or no?`,
              {
                parse_mode: 'markdown',
                reply_markup: {
                  keyboard: [['yes', 'no']],
                  one_time_keyboard: true,
                  resize_keyboard: true,
                  selective: true
                },
                reply_to_message_id: ctx.message.message_id
              }
            );
          }

        } else if (substep === 'transport') { // --- TRANSPORT ---
          ctx.session.location.name = ctx.message.text.trim();
          ctx.session.step = 'locations:limit';

          await this.telegram.sendMessage(
            ctx.chat.id,
            `${mentionSender(ctx)}, how are you usually travelling to ${ctx
              .session.location.name}?`,
            {
              parse_mode: 'markdown',
              reply_markup: {
                keyboard: supportedTransportModes.map(mode => [mode.name]),
                one_time_keyboard: true,
                resize_keyboard: true,
                selective: true
              }
            }
          );

        } else if (substep === 'limit') {
          const receivedMode = ctx.message.text.trim();
          const chosenMode = supportedTransportModes
            .filter(transport => transport.name === receivedMode)
            .map(transport => transport.alias);

          if (chosenMode.length === 0) {

            await this.telegram.sendMessage(
              ctx.chat.id,
              `I do not know this mode of travelling, use the buttons to reply ...`,
              { reply_to_message_id: ctx.message.message_id }
            );

            await pause(500);

            await this.telegram.sendMessage(
              ctx.chat.id,
              `${mentionSender(ctx)}, how do you normally travel to ${ctx.session
                .location.name}?`,
              {
                parse_mode: 'markdown',
                reply_markup: {
                  keyboard: supportedTransportModes.map(mode => [mode.name]),
                  one_time_keyboard: true,
                  resize_keyboard: true,
                  selective: true
                }
              }
            );
          } else {
            ctx.session.location.transport = chosenMode[0];
            ctx.session.step = 'locations:finish';

            await this.telegram.sendMessage(
              ctx.chat.id,
              `I can only show you flats that are a certain distance away from ${ctx.session
                .location.name}.`
            );

            await this.telegram.sendMessage(
              ctx.chat.id,
              `${mentionSender(
                ctx
              )}, what is the maximum time you would like to travel?`,
              {
                parse_mode: 'markdown',
                reply_markup: {
                  keyboard: [['10 min', '15 min', '20 min'], ['25 min', '30 min', 'any']],
                  one_time_keyboard: true,
                  resize_keyboard: true,
                  selective: true
                }
              }
            );
          }

        } else if (substep === 'finish') {
          const time = /^any$|\s*(\d+)\smin\s*$/.exec(ctx.message.text);
          if (time != null && time.length === 2) {
            if (time[0] === "any") {
              ctx.session.location.limit = -1;
            } else {
              ctx.session.location.limit = parseInt(time[1]);
            }
            ctx.session.search.locations.push(ctx.session.location);
            ctx.session.step = 'locations:continue';

            await this.telegram.sendMessage(
              ctx.chat.id,
              'I will remember this location and inform you about travelling times for each flat that I will find.'
            );

            await this.telegram.sendMessage(
              ctx.chat.id,
              `So, ${mentionSender(
                ctx
              )}, would you like to add another location?`,
              {
                parse_mode: 'markdown',
                reply_markup: {
                  keyboard: [['yes', 'no']],
                  one_time_keyboard: true,
                  resize_keyboard: true,
                  selective: true
                }
              }
            );
          } else {
            await this.telegram.sendMessage(
              ctx.chat.id,
              `${mentionSender(
                ctx
              )}, what is the maximum time you would like to travel?`,
              {
                parse_mode: 'markdown',
                reply_markup: {
                  keyboard: [['10 min', '15 min', '20 min'], ['25 min', '30 min', 'any']],
                  one_time_keyboard: true,
                  resize_keyboard: true,
                  selective: true
                }
              }
            );
          }

        } else if (substep === 'continue') {
          const response = ctx.message.text.trim().toLowerCase();

          if (response === 'yes') {
            ctx.session.step = 'locations:add';

            await this.telegram.sendMessage(
              ctx.chat.id,
              `Ok, ${mentionSender(
                ctx
              )}, please send me the address of the location.`,
              {
                parse_mode: 'markdown',
                reply_markup: { force_reply: true, selective: true }
              }
            );
          } else if (response === 'no') {
            // we are done!
            ctx.session.intent = null;
            ctx.session.step = null;

            const id = await this.createNewSearch(ctx.session.search);

            if (id >= 0) {
              await this.telegram.sendMessage(
                ctx.chat.id,
                `I successfully saved your search with the id *${id}*.`,
                {
                  parse_mode: 'markdown',
                  reply_markup: {
                    remove_keyboard: true
                  }
                }
              );

              await pause(500);

              await this.telegram.sendMessage(
                ctx.chat.id,
                `You can now subscribe from any chat to this search.`
              );

              await pause(500);

              await this.telegram.sendMessage(
                ctx.chat.id,
                `Go to the chat of your choice and *add me to the conversation*. Then use the command \`/subscribe ${id}\` to receive messages as new flats become available.`,
                {
                  parse_mode: 'markdown'
                }
              );
            } else {
              await this.telegram.sendMessage(
                ctx.chat.id,
                `Oh no, I messed up your search. Please try again later ...`,
                {
                  reply_markup: {
                    remove_keyboard: true
                  }
                }
              );
            }
          } else {
            await this.telegram.sendMessage(
              ctx.chat.id,
              `Sorry ${mentionSender(ctx)}, I did not understand. Yes or no?`,
              {
                parse_mode: 'markdown',
                reply_markup: {
                  keyboard: [['yes', 'no']],
                  one_time_keyboard: true,
                  resize_keyboard: true,
                  selective: true
                },
                reply_to_message_id: ctx.message.message_id
              }
            );
          }
        }
      }
    }
  }

  private async sendFlatToChat(
    flat: Flat,
    directions: IDirection[],
    chatId: number
  ): Promise<void> {
    const message = [];
    const chat = await this.telegram.getChat(chatId);
    const salution = chat.first_name ? chat.first_name : 'guys';
    const url = crawlerUrls[flat.source] ? crawlerUrls[flat.source](flat) : 'about:blank';

    console.log('sending message to chat', chatId);

    message.push(`Hey ${salution}, found *a new flat on ${flat.source}*!`);
    message.push(`[${flat.title}](${url})`);
    message.push(
      `The flat costs *${flat.rent}€* rent. It has *${flat.rooms} rooms* and *${flat.squaremeters} sqm*.`
    );

    if (directions != null) {
      directions.forEach(direction => {
        message.push(
          `From this flat to *${direction.targetName}* will take you *${direction
            .leg.duration.text}* (${direction.leg.distance
              .text}) by ${direction.transport}.`
        );
      });
    } else {
      message.push(`Sorry, I could not calculate any trip times for this flat.`);
    }

    await this.telegram.sendMessage(chat.id, message.join('\n'), {
      parse_mode: 'Markdown'
    });
  }
}