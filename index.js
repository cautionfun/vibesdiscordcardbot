const sqlite3 = require('sqlite3');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const { token, baseCardImageUrl, cardImageExtension, baseCardArtImageUrl, cardArtImageExtension } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
var cards_db = new sqlite3.Database('./cards.db');

const get_card = (name) => {
    return new Promise((resolve, reject) => {
        var punctuationRegex = /[!"#$%&'’()*+,-./:;<=>?@[\]^_`{|}~ ]/g;
        name = name.replace(punctuationRegex, '').toLowerCase();

        if (name !== 'random') {
            cards_db.get("SELECT * FROM cards WHERE search_name = ? ORDER BY id", [name], function (err, row) {
                if (row === undefined) {
                    if (name.length < 3) {
                        reject("card name is too short");
                    } else {
                        name = name + '%';
                        cards_db.get("SELECT * FROM cards WHERE search_name LIKE ? ORDER BY id", [name], function (err, row) {
                            if (row === undefined) {
                                name = '%' + name;
                                cards_db.get("SELECT * FROM cards WHERE search_name LIKE ? ORDER BY id", [name], function (err, row) {
                                    if (row === undefined) {
                                        reject("card not found");
                                    } else {
                                        resolve(row);
                                    }
                                });
                            } else {
                                resolve(row);
                            }
                        });
                    }
                } else {
                    resolve(row);
                }
            });
        } else {
            cards_db.get("SELECT * FROM cards WHERE id IN (SELECT id FROM cards ORDER BY RANDOM() LIMIT 1)", [], function (err, row) {
                resolve(row);
            });
        }
    });
};

async function generateDeckImage(deckJson) {
    const deck = JSON.parse(deckJson);
    const { counts } = deck;
    const cardWidth = 150;
    const cardHeight = 210;
    const cardsPerRow = 5;
    const margin = 2;
    const overlayWidth = 69;
    const rows = Math.ceil(Object.keys(counts).length / cardsPerRow);
    const canvasWidth = (cardWidth + margin) * cardsPerRow - margin;
    const canvasHeight = (cardHeight + margin) * rows - margin;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const promises = Object.entries(counts).map(async ([cardName, count], index) => {
        const x = (index % cardsPerRow) * (cardWidth + margin);
        const y = Math.floor(index / cardsPerRow) * (cardHeight + margin);

        try {
            const cardImageUrl = `${baseCardImageUrl}${cardName}${cardImageExtension}`;
            const cardImage = await loadImage(cardImageUrl);

            ctx.drawImage(cardImage, x, y, cardWidth, cardHeight);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            const overlayX = x + (cardWidth - overlayWidth) / 2;
            const overlayY = y + cardHeight - 30;
            ctx.fillRect(overlayX, overlayY, overlayWidth, 21);
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`x${count}`, x + cardWidth / 2, y + cardHeight - 10);
        } catch (error) {
            console.error(`Error loading image for card: ${cardName} - ${error.message}`);
        }
    });

    await Promise.all(promises);
    return canvas.toBuffer('image/png');
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;

        if (commandName === 'card') {
            const query = interaction.options.getString('query');
            
            try {
                let cardinfo = await get_card(query);
                let embedMessage;
                const cardtype = cardinfo.type;
                let cardtext = cardinfo.cardText.replace(/\|/g, ' ').trim();

                if (['Rod', 'Fishsicle', '???'].includes(cardtype)) {
                    embedMessage = `${cardinfo.color}; ${cardinfo.type}; ${cardinfo.rarity}; ${cardtext}`;
                } else if (['Relic', 'Action'].includes(cardtype)) {
                    const cost = JSON.parse(cardinfo.cost).amount;
                    embedMessage = `${cost}; ${cardinfo.color}; ${cardinfo.type}; ${cardinfo.rarity}; ${cardtext}`;
                } else if (cardtype === 'Penguin') {
                    const cost = JSON.parse(cardinfo.cost).amount;
                    const pudge = JSON.parse(cardinfo.pudge).amount;
                    embedMessage = `${cost} ${pudge}/${cardinfo.vibe}; ${cardinfo.color}; ${cardinfo.type}; ${cardinfo.rarity}; ${cardtext}`;
                }

                const cardEmbed = {
                    title: cardinfo.name,
                    description: embedMessage,
                    image: { url: baseCardImageUrl + cardinfo.id + cardImageExtension },
                };

                await interaction.reply({ embeds: [cardEmbed] });
            } catch (error) {
                await interaction.reply(error);
            }
        } else if (commandName === 'cardart') {
            const query = interaction.options.getString('query');

            try {
                const cardinfo = await get_card(query);
                const cardEmbed = {
                    title: cardinfo.name,
                    image: { url: baseCardArtImageUrl + cardinfo.artUrl + cardArtImageExtension },
                };

                await interaction.reply({ embeds: [cardEmbed] });
            } catch (error) {
                await interaction.reply(error);
            }
        } else if (commandName === 'deck') {
            const deckJson = interaction.options.getString('json');

            try {
                const deck = JSON.parse(deckJson);
                const deckName = deck.deckName || 'Deck';
                const imageBuffer = await generateDeckImage(deckJson);
                const copyButton = {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            label: 'Copy Deck Code',
                            style: 1,
                            custom_id: 'copy_deck_code',
                        },
                    ],
                };

                await interaction.reply({
                    content: `${deckName}`,
                    files: [
                        {
                            attachment: imageBuffer,
                            name: `${deckName.replace(/\s+/g, '_')}.png`,
                        },
                    ],
                    components: [copyButton],
                });

                client.decks = client.decks || new Map();
                client.decks.set(interaction.id, deckJson);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error generating your deck image.', ephemeral: true });
            }
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'copy_deck_code') {
            const deckJson = client.decks?.get(interaction.message.interaction.id);

            if (deckJson) {
                await interaction.reply({ content: `Here is your deck code:\n\`\`\`json\n${deckJson}\n\`\`\``, ephemeral: true });
            } else {
                await interaction.reply({ content: 'Could not find the deck code. Please try again.', ephemeral: true });
            }
        }
    }
});

client.login(token);
