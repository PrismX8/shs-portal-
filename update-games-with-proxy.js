const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, 'games');
const scriptInclude = '<script src="../game-proxy-wrapper.js"><\/script>';
const scriptTag = new RegExp(`<script[^>]*game-proxy-wrapper\\.js[^>]*><\\/script>`, 'i');

function updateGameFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (scriptTag.test(content)) {
      console.log(`Already updated: ${path.basename(filePath)}`);
      return false;
    }
    
    const bodyCloseIndex = content.lastIndexOf('</body>');
    if (bodyCloseIndex !== -1) {
      content = content.slice(0, bodyCloseIndex) + scriptInclude + '\n' + content.slice(bodyCloseIndex);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${path.basename(filePath)}`);
      return true;
    } else {
      console.log(`Skipped (no closing body tag): ${path.basename(filePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`Error updating ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

function processGamesDirectory() {
  try {
    const files = fs.readdirSync(gamesDir);
    const gameFiles = files.filter(f => f.startsWith('game-') && f.endsWith('.html'));
    
    console.log(`Found ${gameFiles.length} game files to process...`);
    
    let updated = 0;
    gameFiles.forEach(file => {
      if (updateGameFile(path.join(gamesDir, file))) {
        updated++;
      }
    });
    
    console.log(`\nCompleted! Updated ${updated} game files.`);
  } catch (error) {
    console.error('Error processing directory:', error);
  }
}

processGamesDirectory();
