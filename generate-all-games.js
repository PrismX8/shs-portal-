<<<<<<< HEAD
const fs = require('fs');
const path = require('path');

// Read the template
const templatePath = path.join(__dirname, 'games', 'game-template.html');
const template = fs.readFileSync(templatePath, 'utf8');

// Read script.js to extract games
const scriptPath = path.join(__dirname, 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Extract gameSites array using regex
const gameSitesMatch = scriptContent.match(/const gameSites = \[([\s\S]*?)\];/);
if (!gameSitesMatch) {
    console.error('Could not find gameSites array in script.js');
    process.exit(1);
}

// Parse the games array (simple parsing)
const gamesArrayStr = gameSitesMatch[1];
const games = [];

// Extract each game object
const gameMatches = gamesArrayStr.matchAll(/\{\s*title:\s*['"]([^'"]+)['"],\s*embed:\s*['"]([^'"]+)['"]/g);
for (const match of gameMatches) {
    games.push({
        title: match[1],
        embed: match[2]
    });
}

console.log(`Found ${games.length} games in script.js`);

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
            .replace(/\{\{GAME_EMBED\}\}/g, game.embed);
        
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

=======
const fs = require('fs');
const path = require('path');

// Read the template
const templatePath = path.join(__dirname, 'games', 'game-template.html');
const template = fs.readFileSync(templatePath, 'utf8');

// Read script.js to extract games
const scriptPath = path.join(__dirname, 'script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Extract gameSites array using regex
const gameSitesMatch = scriptContent.match(/const gameSites = \[([\s\S]*?)\];/);
if (!gameSitesMatch) {
    console.error('Could not find gameSites array in script.js');
    process.exit(1);
}

// Parse the games array (simple parsing)
const gamesArrayStr = gameSitesMatch[1];
const games = [];

// Extract each game object
const gameMatches = gamesArrayStr.matchAll(/\{\s*title:\s*['"]([^'"]+)['"],\s*embed:\s*['"]([^'"]+)['"]/g);
for (const match of gameMatches) {
    games.push({
        title: match[1],
        embed: match[2]
    });
}

console.log(`Found ${games.length} games in script.js`);

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
            .replace(/\{\{GAME_EMBED\}\}/g, game.embed);
        
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

>>>>>>> 4dc6f7c1eebb0225a85825bf311a9cd1ce826522
