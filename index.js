const sqlite3 = require('sqlite3');
var cards_db = new sqlite3.Database('./cards.db');

const get_card = (name) => {
  return new Promise ((resolve, reject) => {
    var punctuationRegex = /[!"#$%&'’()*+,-./:;<=>?@[\]^_`{|}~ ]/g;
    name = name.replace(punctuationRegex, '');
    name = name.toLowerCase();
    if (name != 'random') {
      cards_db.get("SELECT * FROM cards WHERE search_name = ? ORDER BY id", [name], function(err,row) {
        if (row === undefined) {
          if (name.length < 3) {
            reject("card name is too short");
            return;
          }
          else {
            name = name + '%';
            cards_db.get("SELECT * FROM cards WHERE search_name like ? ORDER BY id", [name], function(err,row) {
              if (row === undefined) {
                name = '%' + name;
                cards_db.get("SELECT * FROM cards WHERE search_name like ? ORDER BY id", [name], function(err,row) {
                  if (row === undefined) {
                    reject("card not found");
                    return;
                  }
                  else {
                    resolve(row);
                    return;
                  }
                });
              }
              else {
                resolve(row);
                return;
              }
            });
          }
        }
        else {
          resolve(row);
          return;
        }
      });
    }
    else {
      cards_db.get("SELECT * FROM cards WHERE id IN (SELECT id FROM cards ORDER BY RANDOM() LIMIT 1)", [], function(err,row) {
        resolve(row);
        return;
      });
    }
  });
}

const { Client, Events, GatewayIntentBits } = require('discord.js');
const { token, baseCardImageUrl, cardImageExtension, baseCardArtImageUrl, cardArtImageExtension } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;
  if (commandName === 'card') {
    const query = interaction.options.getString('query');
    var message;
    var embedMessage;
    try {
      let cardinfo = await get_card(query);
      var cardtype = cardinfo.type;
      var cardtext = cardinfo.cardText;
      cardtext = cardtext.replace(/\|/g, ' ');
      cardtext = cardtext.trim();
      if (cardtype == 'Rod' || cardtype == 'Fishsicle' || cardtype == '???') {
        embedMessage = cardinfo.color + '; ' + cardinfo.type + '; ' + cardinfo.rarity + '; ' + cardtext;
      }
      else if (cardtype == 'Relic' || cardtype == 'Action') {
        var cost = JSON.parse(cardinfo.cost);
        cost = cost.amount;
        embedMessage = cost + '; ' + cardinfo.color + '; ' + cardinfo.type + '; ' + cardinfo.rarity + '; ' + cardtext;
      }
      else if (cardtype == 'Penguin') {
        var cost = JSON.parse(cardinfo.cost);
        cost = cost.amount;
        var pudge = JSON.parse(cardinfo.pudge);
        pudge = pudge.amount;
        embedMessage = cost + ' ' + pudge + '/' + cardinfo.vibe + '; ' + cardinfo.color + '; ' + cardinfo.type + '; ' + cardinfo.rarity + '; ' + cardtext;
      }
      var cardEmbed = {
        title: cardinfo.name,
        description: embedMessage,
        image: { url: baseCardImageUrl + cardinfo.id + cardImageExtension },
      }
    }
    catch (error) {
      message = error;
    }
    if (cardEmbed)
      await interaction.reply({ embeds: [cardEmbed] });
    else
      await interaction.reply(message);
  }
  else if (commandName === 'cardart') {
    const query = interaction.options.getString('query');
    var message;
    try {
      let cardinfo = await get_card(query);
      var cardEmbed = {
        title: cardinfo.name,
        image: { url: baseCardArtImageUrl + cardinfo.artUrl + cardArtImageExtension },
      }
    }
    catch (error) {
      message = error;
    }
    if (cardEmbed)
      await interaction.reply({ embeds: [cardEmbed] });
    else
      await interaction.reply(message);
  }
});

client.login(token);
