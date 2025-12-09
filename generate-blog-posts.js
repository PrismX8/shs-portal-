const fs = require('fs');
const path = require('path');

const posts = [
  {
    slug: 'classroom-friendly-racing-games',
    title: 'Classroom-Friendly Racing Games',
    category: 'Guides',
    summary: 'Fast but low-stress racers you can play between classes without getting overwhelmed.'
  },
  {
    slug: 'best-games-for-potato-laptops',
    title: 'Best Games for Potato Laptops',
    category: 'Guides',
    summary: 'Lightweight titles that still feel premium, even on older school devices.'
  },
  {
    slug: 'mouse-vs-trackpad-which-is-better',
    title: 'Mouse vs. Trackpad: Which Is Better?',
    category: 'Tips & Tricks',
    summary: 'A breakdown of how your input device changes accuracy and reaction time.'
  },
  {
    slug: 'five-games-one-keyboard',
    title: '5 Games to Play with a Friend on One Keyboard',
    category: 'Multiplayer',
    summary: 'Local multiplayer picks that squeeze two players onto the same keys.'
  },
  {
    slug: 'becoming-that-clutch-teammate',
    title: 'Becoming That Clutch Teammate',
    category: 'Strategy',
    summary: 'Mindset, comms, and decision-making tips for late-game moments.'
  },
  {
    slug: 'games-to-chill-after-a-test',
    title: 'Games to Chill With After a Test',
    category: 'Lifestyle',
    summary: 'Low-pressure, cozy titles perfect for decompressing after exams.'
  },
  {
    slug: 'keybind-setups-used-by-top-players',
    title: 'Keybind Setups Used by Top Players',
    category: 'Tips & Tricks',
    summary: 'Example layouts you can copy and tweak for shooters, racers, and platformers.'
  },
  {
    slug: 'how-to-warm-up-in-five-minutes',
    title: 'How to Warm Up in 5 Minutes',
    category: 'Training',
    summary: 'Micro-practice routines that boost aim and focus before a serious run.'
  },
  {
    slug: 'offline-ready-browser-games',
    title: 'Offline-Ready Browser Games',
    category: 'Guides',
    summary: 'Options that keep working when school Wi-Fi is laggy or blocked.'
  },
  {
    slug: 'games-that-run-well-on-chromebooks',
    title: 'Games That Run Well on Chromebooks',
    category: 'Guides',
    summary: 'Chromebook-friendly picks that balance visuals and smooth framerates.'
  },
  {
    slug: 'how-to-build-a-daily-gaming-routine',
    title: 'How to Build a Daily Gaming Routine',
    category: 'Lifestyle',
    summary: 'Simple schedules that keep gaming fun without wrecking homework time.'
  },
  {
    slug: 'soundtracks-that-make-homework-better',
    title: 'Soundtracks That Make Homework Better',
    category: 'Lifestyle',
    summary: 'Calm game OSTs to loop in the background while you study.'
  },
  {
    slug: 'five-minute-games-for-short-breaks',
    title: 'Five-Minute Games for Short Breaks',
    category: 'Guides',
    summary: 'Bite-size experiences that fit neatly between classes or tasks.'
  },
  {
    slug: 'beginner-friendly-fps-titles',
    title: 'Beginner-Friendly FPS Titles',
    category: 'Guides',
    summary: 'Low-tilt shooters that help new players learn without getting stomped.'
  },
  {
    slug: 'games-with-zero-jump-scares',
    title: 'Games with Zero Jump Scares',
    category: 'Guides',
    summary: 'For players who like tense gameplay but hate cheap horror tricks.'
  },
  {
    slug: 'high-score-games-for-competing-with-friends',
    title: 'High-Score Games for Competing with Friends',
    category: 'Multiplayer',
    summary: 'Leaderboards and endless modes that turn any spare time into a mini tournament.'
  },
  {
    slug: 'low-noise-games-for-quiet-environments',
    title: 'Low-Noise Games for Quiet Environments',
    category: 'Guides',
    summary: 'Titles that stay fun with sound off or at super low volume.'
  },
  {
    slug: 'reaction-time-training-games',
    title: 'Reaction-Time Training Games',
    category: 'Training',
    summary: 'Fast-click challenges that sharpen your reflexes over time.'
  },
  {
    slug: 'school-safe-strategy-games',
    title: 'School-Safe Strategy Games',
    category: 'Strategy',
    summary: 'Brainy titles that feel like puzzles instead of pure chaos.'
  },
  {
    slug: 'best-games-for-short-lunch-breaks',
    title: 'Best Games for Short Lunch Breaks',
    category: 'Guides',
    summary: 'Modes that start fast, end fast, and still feel satisfying.'
  },
  {
    slug: 'co-op-games-for-small-friend-groups',
    title: 'Co-Op Games for Small Friend Groups',
    category: 'Multiplayer',
    summary: 'Experiences that feel better with two to four players working together.'
  },
  {
    slug: 'practicing-aim-without-a-shooter',
    title: 'Practicing Aim Without a Shooter',
    category: 'Training',
    summary: 'Non-violent games that still demand precise mouse control.'
  },
  {
    slug: 'games-that-dont-require-a-mouse',
    title: "Games That Don't Require a Mouse",
    category: 'Guides',
    summary: 'Keyboard-only titles ideal for cramped desks or laptop use.'
  },
  {
    slug: 'competitive-games-with-short-match-times',
    title: 'Competitive Games with Short Match Times',
    category: 'Multiplayer',
    summary: 'Jump into ranked-style matches that wrap up in just a few minutes.'
  },
  {
    slug: 'best-games-to-play-while-in-call',
    title: 'Best Games to Play While in Call',
    category: 'Lifestyle',
    summary: 'Low-focus titles you can enjoy while chatting with friends or classmates.'
  },
  {
    slug: 'customization-heavy-games',
    title: 'Customization-Heavy Games',
    category: 'Guides',
    summary: 'Experiences focused on skins, outfits, and building your own style.'
  },
  {
    slug: 'movement-focused-platformers',
    title: 'Movement-Focused Platformers',
    category: 'Guides',
    summary: 'Games that feel amazing once you master the physics and momentum.'
  },
  {
    slug: 'stress-relief-clicker-games',
    title: 'Stress-Relief Clicker Games',
    category: 'Guides',
    summary: 'Idle and clicker games perfect for relaxing, fidgeting, and watching numbers climb.'
  },
  {
    slug: 'games-with-built-in-level-editors',
    title: 'Games with Built-In Level Editors',
    category: 'Guides',
    summary: 'Create your own challenges and share them with friends.'
  },
  {
    slug: 'non-toxic-multiplayer-picks',
    title: 'Non-Toxic Multiplayer Picks',
    category: 'Multiplayer',
    summary: 'Games where the community tends to be more chill and supportive.'
  },
  {
    slug: 'practice-games-for-wasd-beginners',
    title: 'Practice Games for WASD Beginners',
    category: 'Training',
    summary: 'Gentle intros to movement and camera control for brand-new players.'
  },
  {
    slug: 'top-browser-puzzle-games',
    title: 'Top Browser Puzzle Games',
    category: 'Guides',
    summary: 'Brain teasers that reward logic, pattern recognition, and patience.'
  },
  {
    slug: 'recommended-games-for-touchpad-users',
    title: 'Recommended Games for Touchpad Users',
    category: 'Guides',
    summary: 'Controls that still feel good without an external mouse.'
  },
  {
    slug: 'offline-aiming-drills-you-can-do-anywhere',
    title: 'Offline Aiming Drills You Can Do Anywhere',
    category: 'Training',
    summary: 'Simple exercises to improve tracking and flicks without loading a full game.'
  },
  {
    slug: 'simple-games-for-younger-siblings',
    title: 'Simple Games for Younger Siblings',
    category: 'Family',
    summary: 'Beginner-friendly experiences that are safe to share with little brothers or sisters.'
  },
  {
    slug: 'top-games-that-load-under-10-seconds',
    title: 'Top Games That Load Under 10 Seconds',
    category: 'Guides',
    summary: 'Minimal loading screens so you can start playing almost instantly.'
  },
  {
    slug: 'games-that-work-well-in-split-screen-windows',
    title: 'Games That Work Well in Split-Screen Windows',
    category: 'Guides',
    summary: 'Titles that still feel playable when snapped next to homework or notes.'
  },
  {
    slug: 'best-games-for-practicing-multitasking',
    title: 'Best Games for Practicing Multitasking',
    category: 'Training',
    summary: 'Manage multiple timers, units, or lanes at once to build focus.'
  },
  {
    slug: 'community-favorite-hidden-gems',
    title: 'Community-Favorite Hidden Gems',
    category: 'Community',
    summary: 'Underrated games that regulars recommend but new players often miss.'
  },
  {
    slug: 'games-with-built-in-daily-challenges',
    title: 'Games with Built-In Daily Challenges',
    category: 'Guides',
    summary: 'Log in once a day, clear your challenge, and bounce.'
  },
  {
    slug: 'high-replay-value-single-player-games',
    title: 'High Replay-Value Single-Player Games',
    category: 'Guides',
    summary: 'Runs feel different every time thanks to randomization and unlocks.'
  },
  {
    slug: 'low-commitment-story-games',
    title: 'Low-Commitment Story Games',
    category: 'Guides',
    summary: 'Short narrative experiences that still land an emotional punch.'
  },
  {
    slug: 'games-to-practice-patience-and-timing',
    title: 'Games to Practice Patience and Timing',
    category: 'Training',
    summary: 'Experiences that reward waiting for the perfect moment over rushing.'
  },
  {
    slug: 'keyboard-only-rhythm-games',
    title: 'Keyboard-Only Rhythm Games',
    category: 'Guides',
    summary: 'Tap along to the beat without needing a controller or mouse.'
  },
  {
    slug: 'beginners-guide-to-game-genres',
    title: "Beginner's Guide to Game Genres",
    category: 'Guides',
    summary: 'A simple breakdown of shooters, puzzlers, roguelikes, clickers, and more.'
  },
  {
    slug: 'games-that-teach-resource-management',
    title: 'Games That Teach Resource Management',
    category: 'Strategy',
    summary: 'Strategy and idle titles that make you think about long-term planning.'
  },
  {
    slug: 'quick-warm-up-games-before-sports-practice',
    title: 'Quick Warm-Up Games Before Sports Practice',
    category: 'Training',
    summary: 'Short reflex builders you can play before heading to the gym or field.'
  },
  {
    slug: 'late-night-chill-games',
    title: 'Late-Night Chill Games',
    category: 'Lifestyle',
    summary: 'Calmer experiences with softer visuals and audio for winding down.'
  },
  {
    slug: 'multiplayer-games-that-dont-need-voice-chat',
    title: "Multiplayer Games That Don't Need Voice Chat",
    category: 'Multiplayer',
    summary: 'Co-op and versus titles that work fine using just in-game cues.'
  },
  {
    slug: 'respectful-gaming-at-school',
    title: 'Respectful Gaming at School',
    category: 'Community',
    summary: 'How to enjoy Nebulo without disrupting class or classmates.'
  }
];

function renderPostHtml(post) {
  const date = 'November 2025';
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${post.summary}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3290829368025891"
     crossorigin="anonymous"></script>
    <title>${post.title} - Nebulo Blog</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <link rel="stylesheet" href="../styles.css">
    <link rel="icon" type="image/png" href="../images/logoshs.png">
</head>
<body>
    <div id="visitorCounter" class="animate-on-scroll">
        <span id="onlineCount">0</span> Online | <span id="totalCount">0</span> Total Visitors
        <span class="status-indicator online" style="margin-left: 12px;"></span>
    </div>

    <header class="glass-effect animate-on-scroll">
        <button id="adminBtn" title="Admin Panel" class="header-icon-btn hover-lift">
            <i class="fas fa-cog"></i>
        </button>
        <button id="creditsBtn" title="Credits" class="header-icon-btn hover-lift">
            <i class="fas fa-star"></i>
        </button>
        <div class="headerContent">
            <div class="header-logo-container">
                <a href="../index.html" style="text-decoration: none;">
                    <img src="../images/logoshs.png" alt="Nebulo Logo" class="header-logo">
                </a>
            </div>
            <div class="headerText gradient-text">
                Nebulo
            </div>
            <div class="header-actions">
                <a href="../index.html" class="header-action-btn hover-lift" title="Back to Homepage">
                    <i class="fas fa-home"></i>
                    <span>Home</span>
                </a>
                <a href="blog.html" class="header-action-btn hover-lift" title="Blog">
                    <i class="fas fa-newspaper"></i>
                    <span>Blog</span>
                </a>
                <button id="youtubeWatcherBtn" title="Watch YouTube Videos Privately" class="youtube-watcher-btn hover-lift">
                    <i class="fab fa-youtube"></i>
                    <span class="youtube-btn-text">Watch YouTube Privately</span>
                </button>
            </div>
        </div>
        <button id="notificationBellBtn" title="Notifications" class="header-icon-btn hover-lift notification-bell-btn">
            <i class="fas fa-bell"></i>
            <span id="notificationBadge" class="notification-badge" style="display: none;">0</span>
        </button>
    </header>

    <!-- Notification Dropdown -->
    <div id="notificationDropdown" class="notification-dropdown">
        <div class="notification-dropdown-header">
            <h3><i class="fas fa-bell"></i> Notifications</h3>
            <button id="clearAllNotificationsBtn" class="clear-notifications-btn" title="Clear All">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div id="notificationList" class="notification-list">
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        </div>
    </div>

    <main class="blog-main">
        <div class="blog-container">
            <nav class="breadcrumb">
                <a href="../index.html">Home</a>
                <span class="breadcrumb-separator">/</span>
                <a href="blog.html">Blog</a>
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-current">${post.title}</span>
            </nav>

            <article class="blog-article">
                <div class="blog-article-header">
                    <span class="blog-date">${date}</span>
                    <span class="blog-category">${post.category}</span>
                </div>

                <h1>${post.title}</h1>

                <div class="blog-excerpt">
                    <p>${post.summary}</p>

                    <h2>Why this topic matters</h2>
                    <p>On Nebulo we see players in all kinds of situations: school devices, shared computers, short breaks between classes, and late-night chill sessions. This topic dives into how <strong>${post.title}</strong> fits into that reality and how you can use it to make your gaming time feel smoother, more fun, and less stressful.</p>

                    <h2>Practical tips you can try today</h2>
                    <ul>
                        <li>Start by picking one or two games that match this theme and play them for a few short sessions.</li>
                        <li>Pay attention to what feels comfortable on your device (controls, performance, and focus level).</li>
                        <li>Share your favorite discoveries with friends so you can squad up around the same style of game.</li>
                        <li>Use these games as a warm-up or cool-down around homework, tests, or busier days.</li>
                    </ul>

                    <h2>How this fits into Nebulo</h2>
                    <p>We built Nebulo to feel like a hub, not just a list of links. Articles like this are here to help you navigate that hub: pick games that match your mood, your device, and your schedule. If you find a game that fits this topic perfectly, favorite it, share it, and keep it in your personal rotation.</p>

                    <p>Want more content like this? Check the main blog page for deep dives, high score guides, control tips, and community spotlights that pair nicely with <strong>${post.title}</strong>.</p>
                </div>
            </article>
        </div>
    </main>

    <footer class="site-footer">
        <div class="footer-content">
            <div class="footer-section">
                <ul>
                    <li><a href="../pages/privacy-policy.html" class="footer-link">Privacy Policy</a></li>
                    <li><a href="../pages/about-us.html" class="footer-link">About Us</a></li>
                    <li><a href="../pages/contact-us.html" class="footer-link">Contact Us</a></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2024 Nebulo. All rights reserved.</p>
        </div>
    </footer>

    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
    <script src="../script.js"></script>
</body>
</html>
`;
}

const outDir = path.join(__dirname, 'blog');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

posts.forEach(post => {
  const filename = `blog-${post.slug}.html`;
  const filepath = path.join(outDir, filename);
  const html = renderPostHtml(post);
  fs.writeFileSync(filepath, html, 'utf8');
  console.log('Generated blog:', filename);
});

console.log(`\nGenerated ${posts.length} blog post pages.`);
