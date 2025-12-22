const fs = require('fs');
const path = require('path');

const adCode = `<!-- Display Ad -->
<div style="max-width: 100%; margin: 20px auto; text-align: center; padding: 0 20px;">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3290829368025891"
     crossorigin="anonymous"></script>
<!-- display ads -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-3290829368025891"
     data-ad-slot="9717787503"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
</div>`;

function processDirectory(dirPath, dirName) {
    if (!fs.existsSync(dirPath)) {
        console.log(`Directory ${dirName} does not exist, skipping...`);
        return { processed: 0, skipped: 0, total: 0 };
    }

    const files = fs.readdirSync(dirPath).filter(f => f.startsWith('game-') && f.endsWith('.html'));
    let processed = 0;
    let skipped = 0;

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Skip if already has the ad code
        if (content.includes('data-ad-slot="9717787503"')) {
            skipped++;
            return;
        }
        
        // Add ad code before </body> (but not if it's already there)
        if (content.includes('</body>') && !content.includes(adCode.trim())) {
            // Find the last </body> tag and add ad code before it
            const lastBodyIndex = content.lastIndexOf('</body>');
            if (lastBodyIndex !== -1) {
                content = content.slice(0, lastBodyIndex) + adCode + '\n' + content.slice(lastBodyIndex);
                fs.writeFileSync(filePath, content, 'utf8');
                processed++;
                console.log(`  ✓ Added ad to ${file}`);
            }
        } else {
            skipped++;
        }
    });

    return { processed, skipped, total: files.length };
}

console.log('Adding AdSense code to all game pages...\n');

// Process games/ folder
console.log('Processing games/ folder...');
const gamesResult = processDirectory(path.join(__dirname, 'games'), 'games');
console.log(`  Processed: ${gamesResult.processed}, Skipped: ${gamesResult.skipped}, Total: ${gamesResult.total}\n`);

// Process deploy/games/ folder
console.log('Processing deploy/games/ folder...');
const deployResult = processDirectory(path.join(__dirname, 'deploy', 'games'), 'deploy/games');
console.log(`  Processed: ${deployResult.processed}, Skipped: ${deployResult.skipped}, Total: ${deployResult.total}\n`);

const totalProcessed = gamesResult.processed + deployResult.processed;
const totalSkipped = gamesResult.skipped + deployResult.skipped;
const totalFiles = gamesResult.total + deployResult.total;

console.log('='.repeat(50));
console.log(`Summary:`);
console.log(`  Total files: ${totalFiles}`);
console.log(`  Processed: ${totalProcessed}`);
console.log(`  Skipped (already had ad): ${totalSkipped}`);
console.log('='.repeat(50));
console.log('\nDone! ✓');

