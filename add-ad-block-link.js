const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, 'games');
const files = fs.readdirSync(gamesDir).filter(f => f.startsWith('game-') && f.endsWith('.html'));

console.log(`Found ${files.length} files to process`);

let successCount = 0;
let alreadyProcessedCount = 0;
let errorCount = 0;

files.forEach(file => {
    const filePath = path.join(gamesDir, file);
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if already has the ad-block-styles.css link
        if (content.includes('ad-block-styles.css')) {
            alreadyProcessedCount++;
            return;
        }
        
        // Replace the pattern - handle both LF and CRLF
        const oldPatternCRLF = '    <link rel="stylesheet" href="../styles.css">\r\n    <link rel="icon" type="image/png" href="../images/logoshs.png">';
        const oldPatternLF = '    <link rel="stylesheet" href="../styles.css">\n    <link rel="icon" type="image/png" href="../images/logoshs.png">';
        
        let replaced = false;
        if (content.includes(oldPatternCRLF)) {
            const newPattern = '    <link rel="stylesheet" href="../styles.css">\r\n    <link rel="stylesheet" href="../ad-block-styles.css">\r\n    <link rel="icon" type="image/png" href="../images/logoshs.png">';
            content = content.replace(oldPatternCRLF, newPattern);
            replaced = true;
        } else if (content.includes(oldPatternLF)) {
            const newPattern = '    <link rel="stylesheet" href="../styles.css">\n    <link rel="stylesheet" href="../ad-block-styles.css">\n    <link rel="icon" type="image/png" href="../images/logoshs.png">';
            content = content.replace(oldPatternLF, newPattern);
            replaced = true;
        }
        
        if (replaced) {
            fs.writeFileSync(filePath, content, 'utf8');
            successCount++;
        } else {
            console.log(`Pattern not found in: ${file}`);
            errorCount++;
        }
    } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
        errorCount++;
    }
});

console.log(`\nProcessing complete:`);
console.log(`- Successfully processed: ${successCount}`);
console.log(`- Already had ad-block-styles.css: ${alreadyProcessedCount}`);
console.log(`- Errors: ${errorCount}`);
