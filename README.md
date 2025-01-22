# vibesdiscordcardbot

## Installation

First, setup [Node.js](https://nodejs.org/en/).

Install the following:

```
npm install discord.js sqlite3 canvas
```

Edit `config-default.json` with the appropriate values and save as `config.json`.

Please use appropriate measures to secure your credentials before using in production.

You can create or retrieve your bot's client ID and token from the [Discord developer portal](https://discord.com/developers/applications).

Download a copy of `cards.db` from [https://files.cabbit.dev/vibes/db/cards.db](https://files.cabbit.dev/vibes/db/cards.db).

The images of the cards and card art are also hosted on `files.cabbit.dev`. Feel free to host these yourself and update `config.json` with your host url details.

Before running `vibesdiscordcardbot`, deploy the slash commands to Discord:

```
node deploy-commands.js
```

To run `vibesdiscordcardbot`:

```
node index.js
```

## Usage

```
/card <card-name>
/cardart <card-name>
/deck <deck-JSON>
```

## Thanks

Thanks to cautionfun, rckmtl, saltorious, and segfaultx64!

---

Base: [ridsevilla.base.eth](https://basescan.org/address/0x251870Dd36C71f980D903246D694A9EA04Ec3865)
