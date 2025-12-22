// Simple extraction script - run with: node extract-voice-chat.js
const fs = require('fs');

const scriptContent = fs.readFileSync('script.js', 'utf8');
const lines = scriptContent.split('\n');

// Extract lines 540-3474 (voice chat section)
const voiceChatLines = lines.slice(539, 3474); // 0-indexed, so 539 = line 540

// Add header
const output = `// Voice Chat Module
// Extracted from script.js - All voice chat functionality
// Lines 540-3474 from original script.js

${voiceChatLines.join('\n')}
`;

fs.writeFileSync('voice-chat.js', output, 'utf8');
console.log(`Extracted ${voiceChatLines.length} lines to voice-chat.js`);




