const fs = require('fs');
const path = require('path');

// Base template for premium game pages
const templatePath = path.join(__dirname, 'games', 'game-template.html');
const template = fs.readFileSync(templatePath, 'utf8');

// Local HTML games that live under games/local-html
const localGames = [
  { title: '1', embed: '/games/local-html/cl1.html' },
  { title: '10 Minutes Till Dawn', embed: '/games/local-html/cl10minutestildawn.html' },
  { title: '12 MiniBattles', embed: '/games/local-html/cl12minibattles.html' },
  { title: '2DOOM', embed: '/games/local-html/cl2doom.html' },
  { title: '4th and Goal 2022', embed: '/games/local-html/cl4thandgoal.html' },
  { title: '8 Ball Billiards Classic', embed: '/games/local-html/cl8ballclassic.html' },
  { title: '99 Balls', embed: '/games/local-html/cl99balls.html' },
  { title: '99 Days', embed: '/games/local-html/cl99nightsitf.html' },
  { title: '10-103NK', embed: '/games/local-html/clnullkevin.html' }
];

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

for (const game of localGames) {
  const slug = slugify(game.title);
  const filename = `game-${slug}.html`;
  const outPath = path.join(__dirname, 'games', filename);

  let html = template
    .replace(/{{GAME_TITLE}}/g, game.title)
    .replace(/{{GAME_EMBED}}/g, game.embed);

  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Generated ${filename}`);
}

