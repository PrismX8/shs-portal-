const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/database.db');
const DATABASE_URL = process.env.DATABASE_URL;

let db = null;
let isPostgres = false;

if (DATABASE_URL) {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  isPostgres = true;
} else {
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database(DB_PATH);
}

// Unified query function
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      db.query(sql, params, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    } else {
      if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      } else {
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    }
  });
}

// Initialize database and create tables
async function init() {
  console.log(`[DEBUG] Initializing database`);
  if (!isPostgres) {
    // Ensure data directory exists for SQLite
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`[DEBUG] Created data directory: ${dataDir}`);
    }
    console.log(`[DEBUG] Using SQLite database at ${DB_PATH}`);
  } else {
    console.log(`[DEBUG] Using PostgreSQL database`);
  }
  await createTables();
}

// Create all necessary tables
async function createTables() {
    const autoIncrement = isPostgres ? 'SERIAL' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const datetime = isPostgres ? 'TIMESTAMP' : 'DATETIME';
    const tables = [
      // Contact messages
      `CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        date TEXT NOT NULL,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Chat messages
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        chat_user TEXT NOT NULL,
        text TEXT NOT NULL,
        color TEXT,
        time BIGINT NOT NULL,
        uid TEXT NOT NULL,
        avatar TEXT,
        avatarImage TEXT,
        reactions TEXT,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Online users
      `CREATE TABLE IF NOT EXISTS online_users (
        visitor_id TEXT PRIMARY KEY,
        username TEXT,
        online INTEGER DEFAULT 1,
        timestamp BIGINT NOT NULL,
        last_seen BIGINT,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Visitor count
      `CREATE TABLE IF NOT EXISTS visitor_stats (
        id ${autoIncrement},
        total_visitors INTEGER DEFAULT 0,
        updated_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Banned users
      `CREATE TABLE IF NOT EXISTS banned_users (
        uid TEXT PRIMARY KEY,
        username TEXT,
        reason TEXT,
        banned_by TEXT,
        banned_at BIGINT NOT NULL,
        expires_at BIGINT,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Moderation settings
      `CREATE TABLE IF NOT EXISTS moderation_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Profanity words
      `CREATE TABLE IF NOT EXISTS profanity_words (
        id ${autoIncrement},
        word TEXT UNIQUE NOT NULL,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Moderation stats
      `CREATE TABLE IF NOT EXISTS moderation_stats (
        id ${autoIncrement},
        blocked_messages INTEGER DEFAULT 0,
        banned_users INTEGER DEFAULT 0,
        updated_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Friends
      `CREATE TABLE IF NOT EXISTS friends (
        id ${autoIncrement},
        user_id TEXT NOT NULL,
        friend_id TEXT NOT NULL,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      )`,

      // User profiles
      `CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        avatar TEXT,
        avatarImage TEXT,
        color TEXT,
        status TEXT,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP,
        updated_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Canvas strokes
      `CREATE TABLE IF NOT EXISTS canvas_strokes (
        id TEXT PRIMARY KEY,
        stroke_data TEXT NOT NULL,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Canvas meta
      `CREATE TABLE IF NOT EXISTS canvas_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Typing indicators
      `CREATE TABLE IF NOT EXISTS typing_indicators (
        visitor_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Friend requests
      `CREATE TABLE IF NOT EXISTS friend_requests (
        id ${autoIncrement},
        from_user TEXT NOT NULL,
        to_user TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        timestamp BIGINT NOT NULL,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Private chat messages
      `CREATE TABLE IF NOT EXISTS private_chat_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        from_user TEXT NOT NULL,
        to_user TEXT NOT NULL,
        from_name TEXT,
        text TEXT,
        timestamp BIGINT NOT NULL,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Game categories
      `CREATE TABLE IF NOT EXISTS game_categories (
        game_id TEXT PRIMARY KEY,
        category TEXT
      )`,

      // Game ratings (per user)
      `CREATE TABLE IF NOT EXISTS game_ratings (
        id ${autoIncrement},
        game_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Game rating summary
      `CREATE TABLE IF NOT EXISTS game_rating_summary (
        game_id TEXT PRIMARY KEY,
        average REAL DEFAULT 0,
        count INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0
      )`,

      // Game reviews
      `CREATE TABLE IF NOT EXISTS game_reviews (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        author TEXT,
        rating INTEGER,
        text TEXT,
        timestamp BIGINT,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`,

      // Game stats
      `CREATE TABLE IF NOT EXISTS game_stats (
        game_id TEXT PRIMARY KEY,
        embed TEXT,
        title TEXT,
        clicks INTEGER DEFAULT 0,
        first_clicked BIGINT,
        last_clicked BIGINT,
        created_at ${datetime} DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Create tables sequentially
    for (const sql of tables) {
      try {
        await query(sql);
      } catch (err) {
        console.error('Error creating table:', err);
        // Continue with other tables
      }
    }

    // Add status column to user_profiles if it doesn't exist (migration)
    try {
      await query(`ALTER TABLE user_profiles ADD COLUMN status TEXT`);
    } catch (err) {
      // Ignore error if column already exists
    }

    // Initialize visitor stats if empty
    try {
      const result = await query('SELECT * FROM visitor_stats LIMIT 1');
      const row = result.rows ? result.rows[0] : result[0];
      if (!row) {
        await query('INSERT INTO visitor_stats (total_visitors) VALUES (0)');
      }
    } catch (err) {
      console.error('Error initializing visitor stats:', err);
    }
}

// Get database instance
function getDb() {
  if (isPostgres) {
    return {
      run: (sql, params, callback) => {
        query(sql, params).then(result => {
          callback && callback.call({ lastID: result.rows ? result.rows.insertId : result.insertId });
        }).catch(err => callback && callback(err));
      },
      get: (sql, params, callback) => {
        query(sql, params).then(result => {
          const row = result.rows ? result.rows[0] : result[0];
          callback && callback(null, row);
        }).catch(err => callback && callback(err));
      },
      all: (sql, params, callback) => {
        query(sql, params).then(result => {
          callback && callback(null, result.rows || result);
        }).catch(err => callback && callback(err));
      }
    };
  } else {
    return db;
  }
}

// Close database connection
async function close() {
  if (db) {
    if (isPostgres) {
      await db.end();
    } else {
      await new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    console.log('Database connection closed');
  }
}

module.exports = {
  init,
  getDb,
  close
};

