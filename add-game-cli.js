// Simple CLI to add a new game without manually editing scripts.
// Usage:
//   node add-game-cli.js
//
// It will:
//   1) Ask for title, embed URL, image URL, tags, and description
//   2) Append a new entry to data/games.json
//   3) Generate games/game-<slug>.html from games/game-template.html

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('=== Add New Game ===');

  const title = await ask('Game title: ');
  if (!title) {
    console.error('Title is required.');
    process.exit(1);
  }

  const embed = await ask('Embed URL or local path (e.g. https://... or /games/local-html/file.html): ');
  if (!embed) {
    console.error('Embed URL is required.');
    process.exit(1);
  }

  const image = await ask('Cover image URL (leave blank to use site logo): ');
  const tags = await ask('Tags (comma separated, e.g. "new,action,shooting,free"): ');
  const description = await ask('Short description: ');

  const slug = slugify(title);

  const gameObj = {
    title: title,
    embed: embed,
    image: image || '/images/logoshs.png',
    tags: tags || '',
    description: description || '',
  };

  // 1) Append to data/games.json without reformatting entire file
  const jsonPath = path.join(__dirname, 'data', 'games.json');
  let jsonText = fs.readFileSync(jsonPath, 'utf8');

  const trimmed = jsonText.trimEnd();
  const lastBracketIndex = trimmed.lastIndexOf(']');
  if (lastBracketIndex === -1) {
    console.error('Could not find closing ] in data/games.json');
    process.exit(1);
  }

  const before = trimmed.slice(0, lastBracketIndex);
  const after = trimmed.slice(lastBracketIndex); // includes ]
  const trimmedBefore = before.trimEnd();
  const needsComma = !trimmedBefore.endsWith('[');

  const newEntry =
    (needsComma ? ',\n' : '\n') +
    '    {\n' +
    `        "title":  ${JSON.stringify(gameObj.title)},\n` +
    `        "embed":  ${JSON.stringify(gameObj.embed)},\n` +
    `        "image":  ${JSON.stringify(gameObj.image)},\n` +
    `        "tags":  ${JSON.stringify(gameObj.tags)},\n` +
    `        "description":  ${JSON.stringify(gameObj.description)}\n` +
    '    }';

  const updatedJson = before + newEntry + '\n' + after + '\n';
  fs.writeFileSync(jsonPath, updatedJson, 'utf8');

  // 1b) Update data/game-slugs.json so random-game on detail pages knows about this game
  try {
    const slugsPath = path.join(__dirname, 'data', 'game-slugs.json');
    let slugs = [];
    if (fs.existsSync(slugsPath)) {
      try {
        const rawSlugs = fs.readFileSync(slugsPath, 'utf8').trim();
        if (rawSlugs) {
          slugs = JSON.parse(rawSlugs);
        }
      } catch (e) {
        console.warn('Warning: could not parse data/game-slugs.json, recreating it.');
        slugs = [];
      }
    }

    if (!Array.isArray(slugs)) {
      slugs = [];
    }

    if (!slugs.some((entry) => entry && entry.slug === slug)) {
      slugs.push({ title, slug });
      fs.writeFileSync(slugsPath, JSON.stringify(slugs, null, 2), 'utf8');
    }
  } catch (e) {
    console.warn('Warning: failed to update data/game-slugs.json:', e);
  }

  // 2) Generate premium game page from template
  const templatePath = path.join(__dirname, 'games', 'game-template.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  const outFile = path.join(__dirname, 'games', `game-${slug}.html`);

  const safeDescription = description
    ? escapeHtml(description)
    : escapeHtml(`Play ${title} in fullscreen and enjoy a smooth experience right here on Nebulo.`);

  const html = template
    .replace(/{{GAME_TITLE}}/g, title)
    .replace(/{{GAME_EMBED}}/g, embed)
    .replace(/{{GAME_DESCRIPTION}}/g, safeDescription);

  fs.writeFileSync(outFile, html, 'utf8');

  console.log('\nDone!');
  console.log(`- Added game to ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`- Created page: ${path.relative(process.cwd(), outFile)}`);
  console.log('\nYou can now refresh the site; the new game will appear in All Games and search, and its cube will link to the new page.');
}

main().catch((err) => {
  console.error('Error adding game:', err);
  process.exit(1);
});
