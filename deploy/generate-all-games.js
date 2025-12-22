const fs = require('fs');
const path = require('path');

// Read the template
const templatePath = path.join(__dirname, 'games', 'game-template.html');
const template = fs.readFileSync(templatePath, 'utf8');

// Read data/games.json
const gamesPath = path.join(__dirname, 'data', 'games.json');
let games = [];
if (fs.existsSync(gamesPath)) {
  let content = fs.readFileSync(gamesPath, 'utf8');
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  games = JSON.parse(content);
}

console.log(`Found ${games.length} games in data/games.json`);

// Function to convert title to filename
function titleToFilename(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// Generate all game pages
let successCount = 0;
let errorCount = 0;

games.forEach((game, index) => {
    try {
        const filename = `game-${titleToFilename(game.title)}.html`;
        const filepath = path.join(__dirname, 'games', filename);

        // Replace placeholders
        let content = template
            .replace(/\{\{GAME_TITLE\}\}/g, game.title.replace(/'/g, "\\'"))
            .replace(/\{\{GAME_EMBED\}\}/g, game.embed)
            .replace(/\{\{GAME_DESCRIPTION\}\}/g, game.description || 'No description available.');

        // Write file
        fs.writeFileSync(filepath, content, 'utf8');
        successCount++;

        if ((index + 1) % 50 === 0) {
            console.log(`Generated ${index + 1}/${games.length} games...`);
        }
    } catch (error) {
        console.error(`Error generating ${game.title}:`, error.message);
        errorCount++;
    }
});

console.log(`\n✅ Successfully generated ${successCount} game pages!`);
if (errorCount > 0) {
    console.log(`❌ ${errorCount} errors occurred`);
}
