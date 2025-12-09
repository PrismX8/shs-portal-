const fs = require('fs');
const path = require('path');

// Read newgames.json
const newgamesPath = path.join(__dirname, 'newgames.json');
const newGames = JSON.parse(fs.readFileSync(newgamesPath, 'utf8'));

// Read data/games.json
const gamesPath = path.join(__dirname, 'data', 'games.json');
let existingGames = [];
if (fs.existsSync(gamesPath)) {
  let content = fs.readFileSync(gamesPath, 'utf8');
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  existingGames = JSON.parse(content);
}

// Filter out games that already exist in data/games.json
const existingTitles = new Set(existingGames.map(game => game.title));
const gamesToAdd = newGames.filter(game => !existingTitles.has(game.title));

console.log(`Found ${newGames.length} games in newgames.json`);
console.log(`Adding ${gamesToAdd.length} new games to data/games.json`);

// Append new games
existingGames.push(...gamesToAdd);

// Write back to data/games.json
fs.writeFileSync(gamesPath, JSON.stringify(existingGames, null, 2), 'utf8');

console.log('Games added successfully!');
