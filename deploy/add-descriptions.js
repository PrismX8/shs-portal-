
const fs = require('fs');
const path = require('path');

// Function to generate tags based on title
function generateTags(title) {
  const lowerTitle = title.toLowerCase();
  const tags = [];

  if (lowerTitle.includes('boxing') || lowerTitle.includes('fight') || lowerTitle.includes('punch') || lowerTitle.includes('kick')) {
    tags.push('fighting', 'action', 'combat');
  }
  if (lowerTitle.includes('racing') || lowerTitle.includes('car') || lowerTitle.includes('drift') || lowerTitle.includes('drive') || lowerTitle.includes('bike') || lowerTitle.includes('moto')) {
    tags.push('racing', 'driving', 'speed');
  }
  if (lowerTitle.includes('shooting') || lowerTitle.includes('sniper') || lowerTitle.includes('gun') || lowerTitle.includes('bullet')) {
    tags.push('shooting', 'action', 'fps');
  }
  if (lowerTitle.includes('puzzle') || lowerTitle.includes('match') || lowerTitle.includes('block') || lowerTitle.includes('color')) {
    tags.push('puzzle', 'logic', 'brain');
  }
  if (lowerTitle.includes('ball') || lowerTitle.includes('basketball') || lowerTitle.includes('football') || lowerTitle.includes('soccer')) {
    tags.push('sports', 'ball', 'arcade');
  }
  if (lowerTitle.includes('idle') || lowerTitle.includes('clicker') || lowerTitle.includes('tycoon')) {
    tags.push('idle', 'clicker', 'strategy');
  }
  if (lowerTitle.includes('parkour') || lowerTitle.includes('run') || lowerTitle.includes('jump')) {
    tags.push('parkour', 'running', 'skill');
  }
  if (lowerTitle.includes('zombie') || lowerTitle.includes('survival') || lowerTitle.includes('defense')) {
    tags.push('survival', 'horror', 'defense');
  }
  if (lowerTitle.includes('geometry') || lowerTitle.includes('dash')) {
    tags.push('arcade', 'platformer', 'skill');
  }
  if (lowerTitle.includes('stickman') || lowerTitle.includes('stick')) {
    tags.push('stickman', 'physics', 'fun');
  }
  if (lowerTitle.includes('snake') || lowerTitle.includes('worm')) {
    tags.push('snake', 'arcade', 'classic');
  }
  if (lowerTitle.includes('tower') || lowerTitle.includes('defense')) {
    tags.push('tower-defense', 'strategy', 'battle');
  }
  if (lowerTitle.includes('merge') || lowerTitle.includes('2048')) {
    tags.push('merge', 'puzzle', 'numbers');
  }
  if (lowerTitle.includes('fruit') || lowerTitle.includes('candy') || lowerTitle.includes('match')) {
    tags.push('match-3', 'casual', 'sweet');
  }
  if (lowerTitle.includes('cat') || lowerTitle.includes('dog') || lowerTitle.includes('pet')) {
    tags.push('animal', 'cute', 'simulation');
  }
  if (lowerTitle.includes('farming') || lowerTitle.includes('farm')) {
    tags.push('farming', 'simulation', 'relaxing');
  }
  if (lowerTitle.includes('cooking') || lowerTitle.includes('restaurant')) {
    tags.push('cooking', 'simulation', 'management');
  }
  if (lowerTitle.includes('drawing') || lowerTitle.includes('draw')) {
    tags.push('drawing', 'creative', 'puzzle');
  }
  if (lowerTitle.includes('music') || lowerTitle.includes('rhythm')) {
    tags.push('music', 'rhythm', 'arcade');
  }
  if (lowerTitle.includes('chess') || lowerTitle.includes('board')) {
    tags.push('board', 'strategy', 'classic');
  }
  if (lowerTitle.includes('card') || lowerTitle.includes('solitaire')) {
    tags.push('card', 'solitaire', 'logic');
  }
  if (lowerTitle.includes('dress') || lowerTitle.includes('makeup')) {
    tags.push('dress-up', 'fashion', 'girls');
  }
  if (lowerTitle.includes('adventure') || lowerTitle.includes('quest')) {
    tags.push('adventure', 'exploration', 'story');
  }
  if (lowerTitle.includes('physics') || lowerTitle.includes('ragdoll')) {
    tags.push('physics', 'ragdoll', 'funny');
  }
  if (lowerTitle.includes('io') || lowerTitle.includes('multiplayer')) {
    tags.push('io', 'multiplayer', 'battle');
  }
  if (lowerTitle.includes('simulator') || lowerTitle.includes('sim')) {
    tags.push('simulator', 'realistic', 'driving');
  }
  if (lowerTitle.includes('escape') || lowerTitle.includes('prison')) {
    tags.push('escape', 'adventure', 'puzzle');
  }
  if (lowerTitle.includes('army') || lowerTitle.includes('war')) {
    tags.push('army', 'war', 'strategy');
  }
  if (lowerTitle.includes('pirate') || lowerTitle.includes('ship')) {
    tags.push('pirate', 'adventure', 'sea');
  }
  if (lowerTitle.includes('space') || lowerTitle.includes('alien')) {
    tags.push('space', 'sci-fi', 'shooting');
  }
  if (lowerTitle.includes('dinosaur') || lowerTitle.includes('dino')) {
    tags.push('dinosaur', 'prehistoric', 'adventure');
  }
  if (lowerTitle.includes('magic') || lowerTitle.includes('wizard')) {
    tags.push('magic', 'fantasy', 'adventure');
  }
  if (lowerTitle.includes('horror') || lowerTitle.includes('scary')) {
    tags.push('horror', 'survival', 'thriller');
  }
  if (lowerTitle.includes('relax') || lowerTitle.includes('chill')) {
    tags.push('relaxing', 'casual', 'fun');
  }
  if (lowerTitle.includes('endless') || lowerTitle.includes('infinite')) {
    tags.push('endless', 'arcade', 'addictive');
  }
  if (lowerTitle.includes('platformer') || lowerTitle.includes('jump')) {
    tags.push('platformer', 'skill', 'arcade');
  }
  if (lowerTitle.includes('roguelike') || lowerTitle.includes('rogue')) {
    tags.push('roguelike', 'random', 'strategy');
  }
  if (lowerTitle.includes('crafting') || lowerTitle.includes('build')) {
    tags.push('crafting', 'building', 'creative');
  }
  if (lowerTitle.includes('mining') || lowerTitle.includes('mine')) {
    tags.push('mining', 'adventure', 'resource');
  }
  if (lowerTitle.includes('fishing') || lowerTitle.includes('fish')) {
    tags.push('fishing', 'relaxing', 'simulation');
  }
  if (lowerTitle.includes('flying') || lowerTitle.includes('plane')) {
    tags.push('flying', 'simulator', 'adventure');
  }
  if (lowerTitle.includes('subway') || lowerTitle.includes('train')) {
    tags.push('train', 'driving', 'simulation');
  }
  if (lowerTitle.includes('bus') || lowerTitle.includes('taxi')) {
    tags.push('driving', 'simulation', 'traffic');
  }
  if (lowerTitle.includes('police') || lowerTitle.includes('cop')) {
    tags.push('police', 'chase', 'action');
  }
  if (lowerTitle.includes('thief') || lowerTitle.includes('rob')) {
    tags.push('thief', 'stealth', 'adventure');
  }
  if (lowerTitle.includes('hero') || lowerTitle.includes('super')) {
    tags.push('hero', 'action', 'power');
  }
  if (lowerTitle.includes('monster') || lowerTitle.includes('creature')) {
    tags.push('monster', 'battle', 'fantasy');
  }
  if (lowerTitle.includes('dragon') || lowerTitle.includes('mythical')) {
    tags.push('dragon', 'fantasy', 'adventure');
  }
  if (lowerTitle.includes('princess') || lowerTitle.includes('royal')) {
    tags.push('princess', 'fantasy', 'dress-up');
  }
  if (lowerTitle.includes('beach') || lowerTitle.includes('summer')) {
    tags.push('beach', 'relaxing', 'fun');
  }
  if (lowerTitle.includes('winter') || lowerTitle.includes('snow')) {
    tags.push('winter', 'cold', 'adventure');
  }
  if (lowerTitle.includes('halloween') || lowerTitle.includes('pumpkin')) {
    tags.push('halloween', 'spooky', 'fun');
  }
  if (lowerTitle.includes('christmas') || lowerTitle.includes('holiday')) {
    tags.push('christmas', 'festive', 'fun');
  }
  if (lowerTitle.includes('easter') || lowerTitle.includes('egg')) {
    tags.push('easter', 'spring', 'fun');
  }
  if (lowerTitle.includes('birthday') || lowerTitle.includes('party')) {
    tags.push('birthday', 'party', 'celebration');
  }
  if (lowerTitle.includes('school') || lowerTitle.includes('student')) {
    tags.push('school', 'education', 'fun');
  }
  if (lowerTitle.includes('baby') || lowerTitle.includes('kid')) {
    tags.push('kids', 'cute', 'family');
  }
  if (lowerTitle.includes('love') || lowerTitle.includes('romance')) {
    tags.push('love', 'romance', 'cute');
  }
  if (lowerTitle.includes('friend') || lowerTitle.includes('group')) {
    tags.push('friends', 'co-op', 'fun');
  }
  if (lowerTitle.includes('solo') || lowerTitle.includes('single')) {
    tags.push('solo', 'relaxing', 'personal');
  }
  if (lowerTitle.includes('team') || lowerTitle.includes('squad')) {
    tags.push('team', 'co-op', 'strategy');
  }
  if (lowerTitle.includes('boss') || lowerTitle.includes('challenge')) {
    tags.push('boss', 'hard', 'skill');
  }
  if (lowerTitle.includes('easy') || lowerTitle.includes('simple')) {
    tags.push('easy', 'casual', 'beginner');
  }
  if (lowerTitle.includes('hard') || lowerTitle.includes('difficult')) {
    tags.push('hard', 'challenge', 'expert');
  }
  if (lowerTitle.includes('free') || lowerTitle.includes('no-cost')) {
    tags.push('free', 'accessible', 'online');
  }
  if (lowerTitle.includes('premium') || lowerTitle.includes('paid')) {
    tags.push('premium', 'exclusive', 'quality');
  }
  if (lowerTitle.includes('mobile') || lowerTitle.includes('touch')) {
    tags.push('mobile', 'touchscreen', 'portable');
  }
  if (lowerTitle.includes('pc') || lowerTitle.includes('desktop')) {
    tags.push('pc', 'desktop', 'keyboard');
  }
  if (lowerTitle.includes('browser') || lowerTitle.includes('web')) {
    tags.push('browser', 'web', 'no-download');
  }
  if (lowerTitle.includes('download') || lowerTitle.includes('install')) {
    tags.push('download', 'install', 'offline');
  }
  if (lowerTitle.includes('online') || lowerTitle.includes('internet')) {
    tags.push('online', 'internet', 'connected');
  }
  if (lowerTitle.includes('offline') || lowerTitle.includes('local')) {
    tags.push('offline', 'local', 'independent');
  }
  if (lowerTitle.includes('multiplayer') || lowerTitle.includes('versus')) {
    tags.push('multiplayer', 'versus', 'competitive');
  }
  if (lowerTitle.includes('single-player') || lowerTitle.includes('alone')) {
    tags.push('single-player', 'solo', 'personal');
  }
  if (lowerTitle.includes('co-op') || lowerTitle.includes('cooperative')) {
    tags.push('co-op', 'cooperative', 'teamwork');
  }
  if (lowerTitle.includes('pvp') || lowerTitle.includes('player-vs-player')) {
    tags.push('pvp', 'competitive', 'battle');
  }
  if (lowerTitle.includes('pve') || lowerTitle.includes('player-vs-environment')) {
    tags.push('pve', 'adventure', 'solo');
  }
  if (lowerTitle.includes('arcade') || lowerTitle.includes('classic')) {
    tags.push('arcade', 'classic', 'nostalgic');
  }
  if (lowerTitle.includes('modern') || lowerTitle.includes('new')) {
    tags.push('modern', 'fresh', 'innovative');
  }
  if (lowerTitle.includes('retro') || lowerTitle.includes('old-school')) {
    tags.push('retro', 'old-school', 'vintage');
  }
  if (lowerTitle.includes('pixel') || lowerTitle.includes('8-bit')) {
    tags.push('pixel', '8-bit', 'retro');
  }
  if (lowerTitle.includes('3d') || lowerTitle.includes('three-dimensional')) {
    tags.push('3d', 'immersive', 'realistic');
  }
  if (lowerTitle.includes('2d') || lowerTitle.includes('two-dimensional')) {
    tags.push('2d', 'flat', 'simple');
  }
  if (lowerTitle.includes('vr') || lowerTitle.includes('virtual-reality')) {
    tags.push('vr', 'immersive', 'future');
  }
  if (lowerTitle.includes('ar') || lowerTitle.includes('augmented-reality')) {
    tags.push('ar', 'interactive', 'real-world');
  }
  if (lowerTitle.includes('strategy') || lowerTitle.includes('tactical')) {
    tags.push('strategy', 'tactical', 'thinking');
  }
  if (lowerTitle.includes('action') || lowerTitle.includes('fast-paced')) {
    tags.push('action', 'fast-paced', 'exciting');
  }
  if (lowerTitle.includes('adventure') || lowerTitle.includes('explore')) {
    tags.push('adventure', 'exploration', 'discovery');
  }
  if (lowerTitle.includes('puzzle') || lowerTitle.includes('brain-teaser')) {
    tags.push('puzzle', 'brain-teaser', 'logic');
  }
  if (lowerTitle.includes('simulation') || lowerTitle.includes('sim')) {
    tags.push('simulation', 'realistic', 'immersive');
  }
  if (lowerTitle.includes('role-playing') || lowerTitle.includes('rpg')) {
    tags.push('rpg', 'role-playing', 'story');
  }
  if (lowerTitle.includes('shooter') || lowerTitle.includes('gunplay')) {
    tags.push('shooter', 'gunplay', 'combat');
  }
  if (lowerTitle.includes('platformer') || lowerTitle.includes('jumping')) {
    tags.push('platformer', 'jumping', 'skill');
  }
  if (lowerTitle.includes('racing') || lowerTitle.includes('speed')) {
    tags.push('racing', 'speed', 'competition');
  }
  if (lowerTitle.includes('sports') || lowerTitle.includes('athletic')) {
    tags.push('sports', 'athletic', 'competition');
  }
  if (lowerTitle.includes('fighting') || lowerTitle.includes('combat')) {
    tags.push('fighting', 'combat', 'martial-arts');
  }
  if (lowerTitle.includes('stealth') || lowerTitle.includes('sneak')) {
    tags.push('stealth', 'sneak', 'strategy');
  }
  if (lowerTitle.includes('survival') || lowerTitle.includes('endure')) {
    tags.push('survival', 'endure', 'challenge');
  }
  if (lowerTitle.includes('horror') || lowerTitle.includes('scary')) {
    tags.push('horror', 'scary', 'thrilling');
  }
  if (lowerTitle.includes('casual') || lowerTitle.includes('easy')) {
    tags.push('casual', 'easy', 'relaxing');
  }
  if (lowerTitle.includes('hardcore') || lowerTitle.includes('difficult')) {
    tags.push('hardcore', 'difficult', 'challenging');
  }
  if (lowerTitle.includes('indie') || lowerTitle.includes('independent')) {
    tags.push('indie', 'independent', 'unique');
  }
  if (lowerTitle.includes('aaa') || lowerTitle.includes('big-budget')) {
    tags.push('aaa', 'big-budget', 'polished');
  }
  if (lowerTitle.includes('mobile') || lowerTitle.includes('phone')) {
    tags.push('mobile', 'phone', 'touch');
  }
  if (lowerTitle.includes('console') || lowerTitle.includes('playstation')) {
    tags.push('console', 'playstation', 'controller');
  }
  if (lowerTitle.includes('pc') || lowerTitle.includes('computer')) {
    tags.push('pc', 'computer', 'keyboard');
  }
  if (lowerTitle.includes('browser') || lowerTitle.includes('web')) {
    tags.push('browser', 'web', 'online');
  }
  if (lowerTitle.includes('vr') || lowerTitle.includes('oculus')) {
    tags.push('vr', 'oculus', 'immersive');
  }
  if (lowerTitle.includes('ar') || lowerTitle.includes('augmented')) {
    tags.push('ar', 'augmented', 'interactive');
  }
  if (lowerTitle.includes('multiplayer') || lowerTitle.includes('online')) {
    tags.push('multiplayer', 'online', 'social');
  }
  if (lowerTitle.includes('single-player') || lowerTitle.includes('offline')) {
    tags.push('single-player', 'offline', 'solo');
  }
  if (lowerTitle.includes('co-op') || lowerTitle.includes('team')) {
    tags.push('co-op', 'team', 'cooperative');
  }
  if (lowerTitle.includes('pvp') || lowerTitle.includes('versus')) {
    tags.push('pvp', 'versus', 'competitive');
  }
  if (lowerTitle.includes('pve') || lowerTitle.includes('campaign')) {
    tags.push('pve', 'campaign', 'story');
  }
  if (lowerTitle.includes('arcade') || lowerTitle.includes('coin-op')) {
    tags.push('arcade', 'coin-op', 'classic');
  }
  if (lowerTitle.includes('indie') || lowerTitle.includes('small-dev')) {
    tags.push('indie', 'small-dev', 'creative');
  }
  if (lowerTitle.includes('free') || lowerTitle.includes('f2p')) {
    tags.push('free', 'f2p', 'accessible');
  }
  if (lowerTitle.includes('paid') || lowerTitle.includes('buy')) {
    tags.push('paid', 'buy', 'premium');
  }
  if (lowerTitle.includes('dlc') || lowerTitle.includes('expansion')) {
    tags.push('dlc', 'expansion', 'additional');
  }
  if (lowerTitle.includes('mod') || lowerTitle.includes('modification')) {
    tags.push('mod', 'modification', 'custom');
  }
  if (lowerTitle.includes('hack') || lowerTitle.includes('cheat')) {
    tags.push('hack', 'cheat', 'unfair');
  }
  if (lowerTitle.includes('speedrun') || lowerTitle.includes('fast')) {
    tags.push('speedrun', 'fast', 'challenge');
  }
  if (lowerTitle.includes('achievement') || lowerTitle.includes('trophy')) {
    tags.push('achievement', 'trophy', 'completion');
  }
  if (lowerTitle.includes('leaderboard') || lowerTitle.includes('score')) {
    tags.push('leaderboard', 'score', 'competitive');
  }
  if (lowerTitle.includes('tutorial') || lowerTitle.includes('guide')) {
    tags.push('tutorial', 'guide', 'learning');
  }
  if (lowerTitle.includes('story') || lowerTitle.includes('narrative')) {
    tags.push('story', 'narrative', 'immersive');
  }
  if (lowerTitle.includes('open-world') || lowerTitle.includes('exploration')) {
    tags.push('open-world', 'exploration', 'freedom');
  }
  if (lowerTitle.includes('linear') || lowerTitle.includes('straight')) {
    tags.push('linear', 'straight', 'guided');
  }
  if (lowerTitle.includes('sandbox') || lowerTitle.includes('creative')) {
    tags.push('sandbox', 'creative', 'freedom');
  }
  if (lowerTitle.includes('procedural') || lowerTitle.includes('random')) {
    tags.push('procedural', 'random', 'replayable');
  }
  if (lowerTitle.includes('roguelike') || lowerTitle.includes('permadeath')) {
    tags.push('roguelike', 'permadeath', 'replayable');
  }
  if (lowerTitle.includes('metroidvania') || lowerTitle.includes('exploration')) {
    tags.push('metroidvania', 'exploration', 'progression');
  }
  if (lowerTitle.includes('battle-royale') || lowerTitle.includes('last-man-standing')) {
    tags.push('battle-royale', 'last-man-standing', 'survival');
  }
  if (lowerTitle.includes('moba') || lowerTitle.includes('multiplayer-online-battle-arena')) {
    tags.push('moba', 'team', 'strategy');
  }
  if (lowerTitle.includes('rts') || lowerTitle.includes('real-time-strategy')) {
    tags.push('rts', 'command', 'strategy');
  }
  if (lowerTitle.includes('tbs') || lowerTitle.includes('turn-based-strategy')) {
    tags.push('tbs', 'turn-based', 'strategy');
  }
  if (lowerTitle.includes('tower-defense') || lowerTitle.includes('td')) {
    tags.push('tower-defense', 'defense', 'strategy');
  }
  if (lowerTitle.includes('card') || lowerTitle.includes('deck-building')) {
    tags.push('card', 'deck-building', 'strategy');
  }
  if (lowerTitle.includes('board') || lowerTitle.includes('tabletop')) {
    tags.push('board', 'tabletop', 'strategy');
  }
  if (lowerTitle.includes('party') || lowerTitle.includes('social')) {
    tags.push('party', 'social', 'fun');
  }
  if (lowerTitle.includes('educational') || lowerTitle.includes('learning')) {
    tags.push('educational', 'learning', 'fun');
  }
  if (lowerTitle.includes('simulation') || lowerTitle.includes('life-sim')) {
    tags.push('simulation', 'life-sim', 'immersive');
  }
  if (lowerTitle.includes('management') || lowerTitle.includes('tycoon')) {
    tags.push('management', 'tycoon', 'strategy');
  }
  if (lowerTitle.includes('dating') || lowerTitle.includes('romance')) {
    tags.push('dating', 'romance', 'social');
  }
  if (lowerTitle.includes('visual-novel') || lowerTitle.includes('vn')) {
    tags.push('visual-novel', 'story', 'choice');
  }
  if (lowerTitle.includes('text-adventure') || lowerTitle.includes('interactive-fiction')) {
    tags.push('text-adventure', 'interactive-fiction', 'story');
  }
  if (lowerTitle.includes('point-and-click') || lowerTitle.includes('adventure')) {
    tags.push('point-and-click', 'adventure', 'puzzle');
  }
  if (lowerTitle.includes('fmv') || lowerTitle.includes('full-motion-video')) {
    tags.push('fmv', 'cinematic', 'story');
  }
  if (lowerTitle.includes('walking-simulator') || lowerTitle.includes('exploration')) {
    tags.push('walking-simulator', 'exploration', 'atmospheric');
  }
  if (lowerTitle.includes('horror') || lowerTitle.includes('survival-horror')) {
    tags.push('horror', 'survival-horror', 'scary');
  }
  if (lowerTitle.includes('psychological') || lowerTitle.includes('mind-bending')) {
    tags.push('psychological', 'mind-bending', 'thriller');
  }
  if (lowerTitle.includes('comedy') || lowerTitle.includes('funny')) {
    tags.push('comedy', 'funny', 'lighthearted');
  }
  if (lowerTitle.includes('drama') || lowerTitle.includes('emotional')) {
    tags.push('drama', 'emotional', 'story');
  }
  if (lowerTitle.includes('sci-fi') || lowerTitle.includes('science-fiction')) {
    tags.push('sci-fi', 'future', 'technology');
  }
  if (lowerTitle.includes('fantasy') || lowerTitle.includes('magic')) {
    tags.push('fantasy', 'magic', 'mythical');
  }
  if (lowerTitle.includes('historical') || lowerTitle.includes('history')) {
    tags.push('historical', 'history', 'educational');
  }
  if (lowerTitle.includes('western') || lowerTitle.includes('cowboy')) {
    tags.push('western', 'cowboy', 'adventure');
  }
  if (lowerTitle.includes('cyberpunk') || lowerTitle.includes('dystopian')) {
    tags.push('cyberpunk', 'dystopian', 'futuristic');
  }
  if (lowerTitle.includes('steampunk') || lowerTitle.includes('victorian')) {
    tags.push('steampunk', 'victorian', 'inventive');
  }
  if (lowerTitle.includes('post-apocalyptic') || lowerTitle.includes('wasteland')) {
    tags.push('post-apocalyptic', 'wasteland', 'survival');
  }
  if (lowerTitle.includes('space') || lowerTitle.includes('outer-space')) {
    tags.push('space', 'outer-space', 'exploration');
  }
  if (lowerTitle.includes('underwater') || lowerTitle.includes('ocean')) {
    tags.push('underwater', 'ocean', 'exploration');
  }
  if (lowerTitle.includes('jungle') || lowerTitle.includes('forest')) {
    tags.push('jungle', 'forest', 'nature');
  }
  if (lowerTitle.includes('desert') || lowerTitle.includes('sand')) {
    tags.push('desert', 'sand', 'harsh');
  }
  if (lowerTitle.includes('mountain') || lowerTitle.includes('climb')) {
    tags.push('mountain', 'climb', 'adventure');
  }
  if (lowerTitle.includes('city') || lowerTitle.includes('urban')) {
    tags.push('city', 'urban', 'modern');
  }
  if (lowerTitle.includes('village') || lowerTitle.includes('rural')) {
    tags.push('village', 'rural', 'peaceful');
  }
  if (lowerTitle.includes('castle') || lowerTitle.includes('medieval')) {
    tags.push('castle', 'medieval', 'fantasy');
  }
  if (lowerTitle.includes('dungeon') || lowerTitle.includes('cave')) {
    tags.push('dungeon', 'cave', 'dark');
  }
  if (lowerTitle.includes('island') || lowerTitle.includes('tropical')) {
    tags.push('island', 'tropical', 'paradise');
  }
  if (lowerTitle.includes('arctic') || lowerTitle.includes('ice')) {
    tags.push('arctic', 'ice', 'cold');
  }
  if (lowerTitle.includes('volcano') || lowerTitle.includes('lava')) {
    tags.push('volcano', 'lava', 'dangerous');
  }
  if (lowerTitle.includes('beach') || lowerTitle.includes('coast')) {
    tags.push('beach', 'coast', 'relaxing');
  }
  if (lowerTitle.includes('sky') || lowerTitle.includes('flying')) {
    tags.push('sky', 'flying', 'freedom');
  }
  if (lowerTitle.includes('underground') || lowerTitle.includes('mine')) {
    tags.push('underground', 'mine', 'dark');
  }
  if (lowerTitle.includes('time-travel') || lowerTitle.includes('time')) {
    tags.push('time-travel', 'time', 'paradox');
  }
  if (lowerTitle.includes('alternate-reality') || lowerTitle.includes('dimension')) {
    tags.push('alternate-reality', 'dimension', 'mysterious');
  }
  if (lowerTitle.includes('superhero') || lowerTitle.includes('hero')) {
    tags.push('superhero', 'hero', 'power');
  }
  if (lowerTitle.includes('villain') || lowerTitle.includes('evil')) {
    tags.push('villain', 'evil', 'antagonist');
  }
  if (lowerTitle.includes('animal') || lowerTitle.includes('pet')) {
    tags.push('animal', 'pet', 'cute');
  }
  if (lowerTitle.includes('robot') || lowerTitle.includes('machine')) {
    tags.push('robot', 'machine', 'technology');
  }
  if (lowerTitle.includes('alien') || lowerTitle.includes('extraterrestrial')) {
    tags.push('alien', 'extraterrestrial', 'sci-fi');
  }
  if (lowerTitle.includes('monster') || lowerTitle.includes('creature')) {
    tags.push('monster', 'creature', 'fantasy');
  }
  if (lowerTitle.includes('ghost') || lowerTitle.includes('spirit')) {
    tags.push('ghost', 'spirit', 'supernatural');
  }
  if (lowerTitle.includes('vampire') || lowerTitle.includes('undead')) {
    tags.push('vampire', 'undead', 'horror');
  }
  if (lowerTitle.includes('werewolf') || lowerTitle.includes('lycanthrope')) {
    tags.push('werewolf', 'lycanthrope', 'horror');
  }
  if (lowerTitle.includes('zombie') || lowerTitle.includes('undead')) {
    tags.push('zombie', 'undead', 'horror');
  }
  if (lowerTitle.includes('demon') || lowerTitle.includes('devil')) {
    tags.push('demon', 'devil', 'horror');
  }
  if (lowerTitle.includes('angel') || lowerTitle.includes('heavenly')) {
    tags.push('angel', 'heavenly', 'fantasy');
  }
  if (lowerTitle.includes('god') || lowerTitle.includes('deity')) {
    tags.push('god', 'deity', 'mythical');
  }
  if (lowerTitle.includes('elf') || lowerTitle.includes('fairy')) {
    tags.push('elf', 'fairy', 'fantasy');
  }
  if (lowerTitle.includes('dwarf') || lowerTitle.includes('gnome')) {
    tags.push('dwarf', 'gnome', 'fantasy');
  }
  if (lowerTitle.includes('orc') || lowerTitle.includes('goblin')) {
    tags.push('orc', 'goblin', 'fantasy');
  }
  if (lowerTitle.includes('human') || lowerTitle.includes('mortal')) {
    tags.push('human', 'mortal', 'realistic');
  }
  if (lowerTitle.includes('ninja') || lowerTitle.includes('samurai')) {
    tags.push('ninja', 'samurai', 'stealth');
  }
  if (lowerTitle.includes('pirate') || lowerTitle.includes('buccaneer')) {
    tags.push('pirate', 'buccaneer', 'adventure');
  }
  if (lowerTitle.includes('knight') || lowerTitle.includes('warrior')) {
    tags.push('knight', 'warrior', 'medieval');
  }
  if (lowerTitle.includes('wizard') || lowerTitle.includes('mage')) {
    tags.push('wizard', 'mage', 'magic');
  }
  if (lowerTitle.includes('archer') || lowerTitle.includes('bow')) {
    tags.push('archer', 'bow', 'ranged');
  }
  if (lowerTitle.includes('swordsman') || lowerTitle.includes('sword')) {
    tags.push('swordsman', 'sword', 'melee');
  }
  if (lowerTitle.includes('gunner') || lowerTitle.includes('rifle')) {
    tags.push('gunner', 'rifle', 'shooting');
  }
  if (lowerTitle.includes('pilot') || lowerTitle.includes('aviator')) {
    tags.push('pilot', 'aviator', 'flying');
  }
  if (lowerTitle.includes('driver') || lowerTitle.includes('racer')) {
    tags.push('driver', 'racer', 'driving');
  }
  if (lowerTitle.includes('sailor') || lowerTitle.includes('navigator')) {
    tags.push('sailor', 'navigator', 'sea');
  }
  if (lowerTitle.includes('explorer') || lowerTitle.includes('adventurer')) {
    tags.push('explorer', 'adventurer', 'discovery');
  }
  if (lowerTitle.includes('scientist') || lowerTitle.includes('researcher')) {
    tags.push('scientist', 'researcher', 'knowledge');
  }
  if (lowerTitle.includes('detective') || lowerTitle.includes('investigator')) {
    tags.push('detective', 'investigator', 'mystery');
  }
  if (lowerTitle.includes('spy') || lowerTitle.includes('agent')) {
    tags.push('spy', 'agent', 'stealth');
  }
  if (lowerTitle.includes('thief') || lowerTitle.includes('burglar')) {
    tags.push('thief', 'burglar', 'stealth');
  }
  if (lowerTitle.includes('police') || lowerTitle.includes('officer')) {
    tags.push('police', 'officer', 'law');
  }
  if (lowerTitle.includes('firefighter') || lowerTitle.includes('fireman')) {
    tags.push('firefighter', 'fireman', 'hero');
  }
  if (lowerTitle.includes('doctor') || lowerTitle.includes('medic')) {
    tags.push('doctor', 'medic', 'healing');
  }
  if (lowerTitle.includes('teacher') || lowerTitle.includes('educator')) {
    tags.push('teacher', 'educator', 'learning');
  }
  if (lowerTitle.includes('chef') || lowerTitle.includes('cook')) {
    tags.push('chef', 'cook', 'food');
  }
  if (lowerTitle.includes('farmer') || lowerTitle.includes('agriculturist')) {
    tags.push('farmer', 'agriculturist', 'nature');
  }
  if (lowerTitle.includes('miner') || lowerTitle.includes('prospector')) {
    tags.push('miner', 'prospector', 'resource');
  }
  if (lowerTitle.includes('fisherman') || lowerTitle.includes('angler')) {
    tags.push('fisherman', 'angler', 'relaxing');
  }
  if (lowerTitle.includes('hunter') || lowerTitle.includes('tracker')) {
    tags.push('hunter', 'tracker', 'survival');
  }
  if (lowerTitle.includes('builder') || lowerTitle.includes('constructor')) {
    tags.push('builder', 'constructor', 'creative');
  }
  if (lowerTitle.includes('artist') || lowerTitle.includes('painter')) {
    tags.push('artist', 'painter', 'creative');
  }
  if (lowerTitle.includes('musician') || lowerTitle.includes('singer')) {
    tags.push('musician', 'singer', 'music');
  }
  if (lowerTitle.includes('dancer') || lowerTitle.includes('performer')) {
    tags.push('dancer', 'performer', 'art');
  }
  if (lowerTitle.includes('actor') || lowerTitle.includes('performer')) {
    tags.push('actor', 'performer', 'drama');
  }
  if (lowerTitle.includes('writer') || lowerTitle.includes('author')) {
    tags.push('writer', 'author', 'story');
  }
  if (lowerTitle.includes('photographer') || lowerTitle.includes('camera')) {
    tags.push('photographer', 'camera', 'art');
  }
  if (lowerTitle.includes('journalist') || lowerTitle.includes('reporter')) {
    tags.push('journalist', 'reporter', 'news');
  }
  if (lowerTitle.includes('politician') || lowerTitle.includes('leader')) {
    tags.push('politician', 'leader', 'power');
  }
  if (lowerTitle.includes('businessman') || lowerTitle.includes('entrepreneur')) {
    tags.push('businessman', 'entrepreneur', 'wealth');
  }
  if (lowerTitle.includes('student') || lowerTitle.includes('learner')) {
    tags.push('student', 'learner', 'education');
  }
  if (lowerTitle.includes('parent') || lowerTitle.includes('guardian')) {
    tags.push('parent', 'guardian', 'family');
  }
  if (lowerTitle.includes('child') || lowerTitle.includes('kid')) {
    tags.push('child', 'kid', 'innocent');
  }
  if (lowerTitle.includes('teenager') || lowerTitle.includes('youth')) {
    tags.push('teenager', 'youth', 'growing');
  }
  if (lowerTitle.includes('adult') || lowerTitle.includes('mature')) {
    tags.push('adult', 'mature', 'experienced');
  }
  if (lowerTitle.includes('elderly') || lowerTitle.includes('senior')) {
    tags.push('elderly', 'senior', 'wise');
  }
  if (lowerTitle.includes('male') || lowerTitle.includes('man')) {
    tags.push('male', 'man', 'masculine');
  }
  if (lowerTitle.includes('female') || lowerTitle.includes('woman')) {
    tags.push('female', 'woman', 'feminine');
  }
  if (lowerTitle.includes('non-binary') || lowerTitle.includes('gender-neutral')) {
    tags.push('non-binary', 'gender-neutral', 'inclusive');
  }
  if (lowerTitle.includes('diverse') || lowerTitle.includes('variety')) {
    tags.push('diverse', 'variety', 'inclusive');
  }
  if (lowerTitle.includes('inclusive') || lowerTitle.includes('accessible')) {
    tags.push('inclusive', 'accessible', 'equal');
  }
  if (lowerTitle.includes('exclusive') || lowerTitle.includes('elite')) {
    tags.push('exclusive', 'elite', 'premium');
  }
  if (lowerTitle.includes('global') || lowerTitle.includes('worldwide')) {
    tags.push('global', 'worldwide', 'universal');
  }
  if (lowerTitle.includes('local') || lowerTitle.includes('regional')) {
    tags.push('local', 'regional', 'community');
  }
  if (lowerTitle.includes('cultural') || lowerTitle.includes('tradition')) {
    tags.push('cultural', 'tradition', 'heritage');
  }
  if (lowerTitle.includes('modern') || lowerTitle.includes('contemporary')) {
    tags.push('modern', 'contemporary', 'current');
  }
  if (lowerTitle.includes('historical') || lowerTitle.includes('past')) {
    tags.push('historical', 'past', 'legacy');
  }
  if (lowerTitle.includes('future') || lowerTitle.includes('futuristic')) {
    tags.push('future', 'futuristic', 'advanced');
  }
  if (lowerTitle.includes('past') || lowerTitle.includes('retro')) {
    tags.push('past', 'retro', 'nostalgic');
  }
  if (lowerTitle.includes('present') || lowerTitle.includes('now')) {
    tags.push('present', 'now', 'current');
  }
  if (lowerTitle.includes('timeless') || lowerTitle.includes('eternal')) {
    tags.push('timeless', 'eternal', 'classic');
  }
  if (lowerTitle.includes('seasonal') || lowerTitle.includes('holiday')) {
    tags.push('seasonal', 'holiday', 'temporary');
  }
  if (lowerTitle.includes('year-round') || lowerTitle.includes('permanent')) {
    tags.push('year-round', 'permanent', 'constant');
  }
  if (lowerTitle.includes('short') || lowerTitle.includes('quick')) {
    tags.push('short', 'quick', 'fast');
  }
  if (lowerTitle.includes('long') || lowerTitle.includes('extended')) {
    tags.push('long', 'extended', 'lengthy');
  }
  if (lowerTitle.includes('easy') || lowerTitle.includes('simple')) {
    tags.push('easy', 'simple', 'beginner');
  }
  if (lowerTitle.includes('hard') || lowerTitle.includes('difficult')) {
    tags.push('hard', 'difficult', 'challenging');
  }
  if (lowerTitle.includes('medium') || lowerTitle.includes('moderate')) {
    tags.push('medium', 'moderate', 'balanced');
  }
  if (lowerTitle.includes('extreme') || lowerTitle.includes('intense')) {
    tags.push('extreme', 'intense', 'advanced');
  }
  if (lowerTitle.includes('casual') || lowerTitle.includes('relaxed')) {
    tags.push('casual', 'relaxed', 'easygoing');
  }
  if (lowerTitle.includes('competitive') || lowerTitle.includes('serious')) {
    tags.push('competitive', 'serious', 'intense');
  }
  if (lowerTitle.includes('cooperative') || lowerTitle.includes('team')) {
    tags.push('cooperative', 'team', 'supportive');
  }
  if (lowerTitle.includes('solo') || lowerTitle.includes('individual')) {
    tags.push('solo', 'individual', 'independent');
  }
  if (lowerTitle.includes('group') || lowerTitle.includes('party')) {
    tags.push('group', 'party', 'social');
  }
  if (lowerTitle.includes('family') || lowerTitle.includes('together')) {
    tags.push('family', 'together', 'bonding');
  }
  if (lowerTitle.includes('friends') || lowerTitle.includes('buddies')) {
    tags.push('friends', 'buddies', 'social');
  }
  if (lowerTitle.includes('strangers') || lowerTitle.includes('online')) {
    tags.push('strangers', 'online', 'anonymous');
  }
  if (lowerTitle.includes('known') || lowerTitle.includes('familiar')) {
    tags.push('known', 'familiar', 'comfortable');
  }
  if (lowerTitle.includes('new') || lowerTitle.includes('fresh')) {
    tags.push('new', 'fresh', 'innovative');
  }
  if (lowerTitle.includes('old') || lowerTitle.includes('classic')) {
    tags.push('old', 'classic', 'timeless');
  }
  if (lowerTitle.includes('popular') || lowerTitle.includes('trending')) {
    tags.push('popular', 'trending', 'hot');
  }
  if (lowerTitle.includes('niche') || lowerTitle.includes('unique')) {
    tags.push('niche', 'unique', 'specialized');
  }
  if (lowerTitle.includes('mainstream') || lowerTitle.includes('common')) {
    tags.push('mainstream', 'common', 'popular');
  }
  if (lowerTitle.includes('underground') || lowerTitle.includes('hidden')) {
    tags.push('underground', 'hidden', 'exclusive');
  }
  if (lowerTitle.includes('viral') || lowerTitle.includes('spread')) {
    tags.push('viral', 'spread', 'popular');
  }
  if (lowerTitle.includes('forgotten') || lowerTitle.includes('lost')) {
    tags.push('forgotten', 'lost', 'nostalgic');
  }
  if (lowerTitle.includes('remembered') || lowerTitle.includes('classic')) {
    tags.push('remembered', 'classic', 'timeless');
  }
  if (lowerTitle.includes('innovative') || lowerTitle.includes('creative')) {
    tags.push('innovative', 'creative', 'original');
  }
  if (lowerTitle.includes('traditional') || lowerTitle.includes('conventional')) {
    tags.push('traditional', 'conventional', 'standard');
  }
  if (lowerTitle.includes('experimental') || lowerTitle.includes('avant-garde')) {
    tags.push('experimental', 'avant-garde', 'risky');
  }
  if (lowerTitle.includes('safe') || lowerTitle.includes('reliable')) {
    tags.push('safe', 'reliable', 'trustworthy');
  }
  if (lowerTitle.includes('dangerous') || lowerTitle.includes('risky')) {
    tags.push('dangerous', 'risky', 'thrilling');
  }
  if (lowerTitle.includes('fun') || lowerTitle.includes('enjoyable')) {
    tags.push('fun', 'enjoyable', 'pleasurable');
  }
  if (lowerTitle.includes('boring') || lowerTitle.includes('dull')) {
    tags.push('boring', 'dull', 'uninteresting');
  }
  if (lowerTitle.includes('exciting') || lowerTitle.includes('thrilling')) {
    tags.push('exciting', 'thrilling', 'adrenaline');
  }
  if (lowerTitle.includes('calm') || lowerTitle.includes('peaceful')) {
    tags.push('calm', 'peaceful', 'serene');
  }
  if (lowerTitle.includes('stressful') || lowerTitle.includes('tense')) {
    tags.push('stressful', 'tense', 'anxious');
  }
  if (lowerTitle.includes('relaxing') || lowerTitle.includes('soothing')) {
    tags.push('relaxing', 'soothing', 'calming');
  }
  if (lowerTitle.includes('challenging') || lowerTitle.includes('tough')) {
    tags.push('challenging', 'tough', 'demanding');
  }
  if (lowerTitle.includes('rewarding') || lowerTitle.includes('satisfying')) {
    tags.push('rewarding', 'satisfying', 'fulfilling');
  }
  if (lowerTitle.includes('frustrating') || lowerTitle.includes('annoying')) {
    tags.push('frustrating', 'annoying', 'irritating');
  }
  if (lowerTitle.includes('addictive') || lowerTitle.includes('engaging')) {
    tags.push('addictive', 'engaging', 'captivating');
  }
  if (lowerTitle.includes('forgettable') || lowerTitle.includes('bland')) {
    tags.push('forgettable', 'bland', 'unmemorable');
  }
  if (lowerTitle.includes('memorable') || lowerTitle.includes('impactful')) {
    tags.push('memorable', 'impactful');
  }

  // Remove duplicates and limit to 5-10 tags
  const uniqueTags = [...new Set(tags)].slice(0, 8);
  return uniqueTags.join(',');
}

// Function to generate description based on title
function generateDescription(title) {
  const lowerTitle = title.toLowerCase();
  let genre = 'action';
  if (lowerTitle.includes('puzzle') || lowerTitle.includes('match') || lowerTitle.includes('block')) {
    genre = 'puzzle';
  } else if (lowerTitle.includes('racing') || lowerTitle.includes('car') || lowerTitle.includes('bike')) {
    genre = 'racing';
  } else if (lowerTitle.includes('shooting') || lowerTitle.includes('sniper') || lowerTitle.includes('gun')) {
    genre = 'shooting';
  } else if (lowerTitle.includes('fighting') || lowerTitle.includes('boxing') || lowerTitle.includes('combat')) {
    genre = 'fighting';
  } else if (lowerTitle.includes('sports') || lowerTitle.includes('ball') || lowerTitle.includes('football')) {
    genre = 'sports';
  } else if (lowerTitle.includes('idle') || lowerTitle.includes('clicker')) {
    genre = 'idle clicker';
  } else if (lowerTitle.includes('simulation') || lowerTitle.includes('sim')) {
    genre = 'simulation';
  } else if (lowerTitle.includes('adventure') || lowerTitle.includes('quest')) {
    genre = 'adventure';
  } else if (lowerTitle.includes('strategy') || lowerTitle.includes('tower')) {
    genre = 'strategy';
  } else if (lowerTitle.includes('platformer') || lowerTitle.includes('jump')) {
    genre = 'platformer';
  }

  const descriptions = [
    `Dive into the thrilling world of ${title}, a captivating ${genre} game that challenges your skills and reflexes. With intuitive controls and engaging gameplay, you'll find yourself hooked from the first moment. Explore various levels, unlock new features, and compete with friends to see who reigns supreme. Whether you're a casual player or a hardcore gamer, ${title} offers endless entertainment and replayability.`,
    `${title} is an exhilarating ${genre} experience that pushes the boundaries of fun and excitement. Featuring stunning visuals, dynamic soundtracks, and innovative mechanics, this game delivers non-stop action and adventure. Master the controls, overcome obstacles, and achieve high scores as you progress through increasingly challenging stages. Perfect for players seeking adrenaline-pumping gameplay and memorable moments.`,
    `Embark on an epic journey in ${title}, where ${genre} meets creativity and strategy. This game combines fast-paced action with thoughtful decision-making, allowing you to customize your approach and discover unique paths to victory. With a rich variety of challenges, power-ups, and multiplayer options, ${title} provides hours of immersive entertainment for gamers of all ages.`,
    `Experience the ultimate ${genre} thrill in ${title}, a game designed to test your limits and reward your perseverance. From intense battles to mind-bending puzzles, every aspect of this title is crafted to deliver maximum enjoyment. Join a community of players, share strategies, and climb the leaderboards in this addictive and rewarding gaming experience.`,
    `Unleash your inner hero in ${title}, a dynamic ${genre} game that blends excitement, strategy, and skill. Navigate through diverse environments, face formidable opponents, and unlock powerful abilities as you progress. With its polished gameplay, stunning graphics, and engaging storyline, ${title} stands out as a must-play for fans of the genre.`,
    `Challenge yourself in ${title}, the ultimate ${genre} game that combines classic gameplay with modern twists. Featuring intuitive mechanics, vibrant visuals, and endless replayability, this title offers something for everyone. Whether playing solo or with friends, you'll enjoy the competitive edge and satisfying progression that makes ${title} a standout in its category.`,
    `Step into the action-packed world of ${title}, where ${genre} gameplay meets innovative design. This game features a perfect balance of challenge and fun, with levels that grow more complex and rewarding. Customize your experience, compete globally, and discover why ${title} has become a favorite among gamers worldwide.`,
    `Discover the joy of ${genre} in ${title}, a game that captivates with its engaging mechanics and endless possibilities. From beginner-friendly tutorials to expert-level challenges, this title ensures that every player finds their perfect level of excitement. With regular updates and a supportive community, ${title} continues to evolve and delight its audience.`,
    `Ignite your passion for ${genre} with ${title}, a game that delivers high-octane action and strategic depth. Featuring a variety of modes, customizable options, and stunning visuals, this title provides an immersive experience that keeps players coming back. Join the adventure and see how far your skills can take you in this thrilling game.`,
    `Transform your gaming sessions with ${title}, an exceptional ${genre} game that combines creativity, challenge, and community. With its intuitive design and rewarding progression, you'll find yourself immersed in a world of fun and competition. Whether you're a newcomer or a veteran, ${title} offers the perfect blend of excitement and satisfaction.`
  ];

  // Choose a random description
  const randomIndex = Math.floor(Math.random() * descriptions.length);
  return descriptions[randomIndex];
}

// Read newgames.json
const newgamesPath = path.join(__dirname, 'newgames.json');
const games = JSON.parse(fs.readFileSync(newgamesPath, 'utf8'));

// Add description and tags to each game
games.forEach(game => {
  if (!game.description) {
    game.description = generateDescription(game.title);
  }
  if (!game.tags) {
    game.tags = generateTags(game.title);
  }
});

// Write back to newgames.json
fs.writeFileSync(newgamesPath, JSON.stringify(games, null, 2), 'utf8');

console.log('Descriptions and tags added to newgames.json');
