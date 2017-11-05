# Flatcrawl
Flatcrawl makes it easy to search for flats! It **collects flats from different rental sites** and **exposes them in a consistent shape**. Furthermore it lets you define **custom searches** through **a Telegram bot** that sends **instant messages on new matches**.

This project consists of three parts:
- **Firebase Realtime Database:** Stores found flats, users and their configured searches.
- **Crawling Scheduler:** A tool that can be setup on a local node with changing IP address. It has yet crawling implementations for different flat renting search engines.
- **Telegram Processor:** Client application that will listen for changes on the realtime database. As soon as a new flat becomes available it will check all user searches and send out messages whenever matches have been found.

Of those **only the crawler and telegram client are under source control**. However, if you setup a firebase account and create an empty database, it will then be filled automatically as soon as you run the crawling application.

## Setup
If you want to run the whole infrastructure yourself, you will need to do the following things:
1) Create a [Firebase account](https://firebase.google.com/) and setup an empty realtime database.
2) [Create a Telegram bot via the BotFather](https://core.telegram.org/bots#creating-a-new-bot).
3) Create the `src/config.ts` file and fill it with the information you should have acquired from step 1 and 2:
```typescript
export const BOT_ID = '...';
export const API_KEY = '...';
export const DATABASE_URL = '...';
```

## Build
Before you can build the code, you need to install all dependencies:
```
yarn install
```
After that, you can run
```
yarn build
```
which will compile all Typescript files and put them in a folder called `dist/`.

## Run
Once you have completed the setup and build steps, you can run the crawler and telegram client.

### Crawler
```
yarn start:crawler
```

### Telegram Client
```
yarn start:client
```