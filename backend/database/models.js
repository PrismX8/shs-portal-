const db = require('./db');

// Get database type for conditional SQL
const isPostgres = process.env.DATABASE_URL ? true : false;
const insertOrIgnore = isPostgres ? 'ON CONFLICT DO NOTHING' : 'OR IGNORE';
const insertOrReplace = isPostgres ? 'ON CONFLICT DO UPDATE SET' : 'OR REPLACE';

// Contact Messages
const ContactMessage = {
  create: (data) => {
    return new Promise((resolve, reject) => {
      const { id, name, email, subject, message, timestamp, date } = data;
      const sql = `INSERT INTO contact_messages (id, name, email, subject, message, timestamp, date) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.getDb().run(sql, [id, name, email, subject, message, timestamp, date], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  },
  
  getAll: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM contact_messages ORDER BY timestamp DESC`;
      db.getDb().all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  getById: (id) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM contact_messages WHERE id = ?`;
      db.getDb().get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

// Chat Messages
const ChatMessage = {
  create: (data) => {
    return new Promise((resolve, reject) => {
      const { id, user, text, color, time, uid, avatar, avatarImage, reactions } = data;
      const reactionsStr = reactions ? JSON.stringify(reactions) : null;
      let sql;
      if (isPostgres) {
        sql = `INSERT INTO chat_messages (id, chat_user, text, color, time, uid, avatar, avatarImage, reactions)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
      } else {
        sql = `INSERT INTO chat_messages (id, chat_user, text, color, time, uid, avatar, avatarImage, reactions)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      }
      console.log(`[DEBUG] Saving chat message: ${user}: ${text.substring(0, 50)}...`);
      db.getDb().run(sql, [id, user, text, color, time, uid, avatar, avatarImage, reactionsStr], function(err) {
        if (err) {
          console.error('[DEBUG] Error saving chat message:', err);
          reject(err);
        } else {
          console.log(`[DEBUG] Chat message saved successfully, id: ${id}`);
          resolve({ id, ...data });
        }
      });
    });
  },
  
  getRecent: (limit = 50) => {
    return new Promise((resolve, reject) => {
      let sql;
      if (isPostgres) {
        sql = `SELECT * FROM chat_messages ORDER BY time DESC LIMIT $1`;
      } else {
        sql = `SELECT * FROM chat_messages ORDER BY time DESC LIMIT ?`;
      }
      db.getDb().all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else {
          const messages = rows.map(row => ({
            ...row,
            user: row.chat_user, // Map back to user for compatibility
            reactions: row.reactions ? JSON.parse(row.reactions) : {}
          }));
          resolve(messages.reverse()); // Return in chronological order
        }
      });
    });
  },
  
  updateReactions: (id, reactions) => {
    return new Promise((resolve, reject) => {
      const reactionsStr = JSON.stringify(reactions);
      const sql = `UPDATE chat_messages SET reactions = ? WHERE id = ?`;
      db.getDb().run(sql, [reactionsStr, id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM chat_messages WHERE id = ?`;
      db.getDb().run(sql, [id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  deleteAll: () => {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM chat_messages`;
      db.getDb().run(sql, [], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Online Users
const OnlineUser = {
  setOnline: (visitorId, username) => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const sql = `INSERT OR REPLACE INTO online_users (visitor_id, username, online, timestamp) 
                   VALUES (?, ?, 1, ?)`;
      db.getDb().run(sql, [visitorId, username, timestamp], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  setOffline: (visitorId) => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const sql = `UPDATE online_users SET online = 0, last_seen = ? WHERE visitor_id = ?`;
      db.getDb().run(sql, [timestamp, visitorId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  getAll: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM online_users WHERE online = 1`;
      db.getDb().all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  cleanup: (maxAge = 3600000) => { // Remove users offline for more than 1 hour
    return new Promise((resolve, reject) => {
      const cutoff = Date.now() - maxAge;
      const sql = `DELETE FROM online_users WHERE online = 0 AND last_seen < ?`;
      db.getDb().run(sql, [cutoff], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Visitor Stats
const VisitorStats = {
  increment: () => {
    return new Promise((resolve, reject) => {
      db.getDb().run(
        `UPDATE visitor_stats SET total_visitors = total_visitors + 1, updated_at = CURRENT_TIMESTAMP`,
        function(err) {
          if (err) reject(err);
          else VisitorStats.get().then(resolve).catch(reject);
        }
      );
    });
  },
  
  get: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT total_visitors FROM visitor_stats LIMIT 1`;
      db.getDb().get(sql, [], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.total_visitors : 0);
      });
    });
  },
  
  set: (count) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE visitor_stats SET total_visitors = ?, updated_at = CURRENT_TIMESTAMP`;
      db.getDb().run(sql, [count], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Banned Users
const BannedUser = {
  create: (data) => {
    return new Promise((resolve, reject) => {
      const { uid, username, reason, banned_by, banned_at, expires_at } = data;
      const sql = `INSERT OR REPLACE INTO banned_users (uid, username, reason, banned_by, banned_at, expires_at) 
                   VALUES (?, ?, ?, ?, ?, ?)`;
      db.getDb().run(sql, [uid, username, reason, banned_by, banned_at, expires_at], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  getAll: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM banned_users WHERE expires_at IS NULL OR expires_at > ?`;
      db.getDb().all(sql, [Date.now()], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  isBanned: (uid) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM banned_users WHERE uid = ? AND (expires_at IS NULL OR expires_at > ?)`;
      db.getDb().get(sql, [uid, Date.now()], (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });
  },
  
  remove: (uid) => {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM banned_users WHERE uid = ?`;
      db.getDb().run(sql, [uid], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Moderation Settings
const ModerationSettings = {
  get: (key) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT value FROM moderation_settings WHERE key = ?`;
      db.getDb().get(sql, [key], (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.value) : null);
      });
    });
  },
  
  getAll: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT key, value FROM moderation_settings`;
      db.getDb().all(sql, [], (err, rows) => {
        if (err) reject(err);
        else {
          const settings = {};
          rows.forEach(row => {
            settings[row.key] = JSON.parse(row.value);
          });
          resolve(settings);
        }
      });
    });
  },
  
  set: (key, value) => {
    return new Promise((resolve, reject) => {
      const valueStr = JSON.stringify(value);
      const sql = `INSERT OR REPLACE INTO moderation_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`;
      db.getDb().run(sql, [key, valueStr], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Profanity Words
const ProfanityWord = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT word FROM profanity_words`;
      db.getDb().all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.word));
      });
    });
  },
  
  add: (word) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT OR IGNORE INTO profanity_words (word) VALUES (?)`;
      db.getDb().run(sql, [word], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  remove: (word) => {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM profanity_words WHERE word = ?`;
      db.getDb().run(sql, [word], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  setAll: (words) => {
    return new Promise((resolve, reject) => {
      db.getDb().run('DELETE FROM profanity_words', [], (err) => {
        if (err) {
          reject(err);
          return;
        }
        if (words.length === 0) {
          resolve();
          return;
        }
        const sql = `INSERT INTO profanity_words (word) VALUES (?)`;
        const stmt = db.getDb().prepare(sql);
        words.forEach(word => {
          stmt.run([word]);
        });
        stmt.finalize((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
};

// Moderation Stats
const ModerationStats = {
  get: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM moderation_stats LIMIT 1`;
      db.getDb().get(sql, [], (err, row) => {
        if (err) reject(err);
        else {
          if (!row) {
            // Initialize if doesn't exist
            db.getDb().run('INSERT INTO moderation_stats (blocked_messages, banned_users) VALUES (0, 0)', (err) => {
              if (err) reject(err);
              else resolve({ blocked_messages: 0, banned_users: 0 });
            });
          } else {
            resolve({
              blocked_messages: row.blocked_messages || 0,
              banned_users: row.banned_users || 0
            });
          }
        }
      });
    });
  },
  
  update: (stats) => {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE moderation_stats SET blocked_messages = ?, banned_users = ?, updated_at = CURRENT_TIMESTAMP`;
      db.getDb().run(sql, [stats.blocked_messages || 0, stats.banned_users || 0], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Friends
const Friend = {
  add: (userId, friendId) => {
    return new Promise((resolve, reject) => {
      let sql;
      if (isPostgres) {
        sql = `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT (user_id, friend_id) DO NOTHING`;
      } else {
        sql = `INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)`;
      }
      db.getDb().run(sql, [userId, friendId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  remove: (userId, friendId) => {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM friends WHERE user_id = ? AND friend_id = ?`;
      db.getDb().run(sql, [userId, friendId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  getAll: (userId) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT friend_id FROM friends WHERE user_id = ?`;
      db.getDb().all(sql, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.friend_id));
      });
    });
  }
};

// User Profiles
const UserProfile = {
  get: (userId) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM user_profiles WHERE user_id = ?`;
      db.getDb().get(sql, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM user_profiles ORDER BY updated_at DESC`;
      db.getDb().all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  set: (userId, profile) => {
    return new Promise((resolve, reject) => {
      const { username, avatar, avatarImage, color, status } = profile;
      let sql;
      if (isPostgres) {
        sql = `INSERT INTO user_profiles (user_id, username, avatar, avatarImage, color, status, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
               ON CONFLICT (user_id) DO UPDATE SET
               username = EXCLUDED.username, avatar = EXCLUDED.avatar, avatarImage = EXCLUDED.avatarImage,
               color = EXCLUDED.color, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`;
      } else {
        sql = `INSERT OR REPLACE INTO user_profiles (user_id, username, avatar, avatarImage, color, status, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
      }
      console.log(`[DEBUG] Saving user profile for ${userId}: ${username}`);
      db.getDb().run(sql, [userId, username, avatar, avatarImage, color, status || null], function(err) {
        if (err) {
          console.error('[DEBUG] Error saving user profile:', err);
          reject(err);
        } else {
          console.log(`[DEBUG] User profile saved successfully for ${userId}`);
          resolve();
        }
      });
    });
  }
};

// Canvas
const Canvas = {
  addStroke: (id, strokeData) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT OR REPLACE INTO canvas_strokes (id, stroke_data) VALUES (?, ?)`;
      db.getDb().run(sql, [id, JSON.stringify(strokeData)], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  getAllStrokes: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, stroke_data FROM canvas_strokes ORDER BY created_at ASC`;
      db.getDb().all(sql, [], (err, rows) => {
        if (err) reject(err);
        else {
          const strokes = rows.map(row => ({
            id: row.id,
            ...JSON.parse(row.stroke_data)
          }));
          resolve(strokes);
        }
      });
    });
  },
  
  clear: () => {
    return new Promise((resolve, reject) => {
      db.getDb().run('DELETE FROM canvas_strokes', [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Typing Indicators
const TypingIndicator = {
  set: (visitorId, username) => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const sql = `INSERT OR REPLACE INTO typing_indicators (visitor_id, username, timestamp) VALUES (?, ?, ?)`;
      db.getDb().run(sql, [visitorId, username, timestamp], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  remove: (visitorId) => {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM typing_indicators WHERE visitor_id = ?`;
      db.getDb().run(sql, [visitorId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  getAll: () => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT visitor_id, username FROM typing_indicators WHERE timestamp > ?`;
      const cutoff = Date.now() - 5000; // Only show typing from last 5 seconds
      db.getDb().all(sql, [cutoff], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  cleanup: () => {
    return new Promise((resolve, reject) => {
      const cutoff = Date.now() - 10000; // Remove typing indicators older than 10 seconds
      const sql = `DELETE FROM typing_indicators WHERE timestamp < ?`;
      db.getDb().run(sql, [cutoff], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Friend Requests
const FriendRequest = {
  add: (fromUser, toUser, status = 'pending', timestamp = Date.now()) => {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO friend_requests (from_user, to_user, status, timestamp) VALUES (?, ?, ?, ?)`;
      db.getDb().run(sql, [fromUser, toUser, status, timestamp], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, fromUser, toUser, status, timestamp });
      });
    });
  },
  
  getById: (id) => {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM chat_messages WHERE id = ?`;
      db.getDb().get(sql, [id], (err, row) => {
        if (err) reject(err);
        else if (!row) resolve(null);
        else resolve({
          ...row,
          reactions: row.reactions ? JSON.parse(row.reactions) : {}
        });
      });
    });
  },

  getTopChatters: (limit = 10) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          user AS username,
          COUNT(*) AS messages,
          MAX(time) AS lastTime,
          MAX(COALESCE(avatar, '👤')) AS avatar,
          MAX(avatarImage) AS avatarImage
        FROM chat_messages
        WHERE user IS NOT NULL
        GROUP BY user
        ORDER BY messages DESC, lastTime DESC
        LIMIT ?
      `;
      db.getDb().all(sql, [limit], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.getDb().all(`SELECT * FROM friend_requests`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  getForUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.getDb().all(`SELECT * FROM friend_requests WHERE status = 'pending' AND (from_user = ? OR to_user = ?)`, [userId, userId], (err, rows) => {
        if (err) reject(err);
        else {
          const sent = rows.filter(r => r.from_user === userId).map(r => r.to_user);
          const received = rows.filter(r => r.to_user === userId).map(r => r.from_user);
          resolve({ sent, received });
        }
      });
    });
  },
  remove: (fromUser, toUser) => {
    return new Promise((resolve, reject) => {
      db.getDb().run(`DELETE FROM friend_requests WHERE (from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?)`, [fromUser, toUser, toUser, fromUser], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  setStatus: (fromUser, toUser, status) => {
    return new Promise((resolve, reject) => {
      db.getDb().run(`UPDATE friend_requests SET status = ? WHERE from_user = ? AND to_user = ?`, [status, fromUser, toUser], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Private chat messages
const PrivateChatMessage = {
  add: (data) => {
    return new Promise((resolve, reject) => {
      const { id, chat_id, from_user, to_user, from_name, text, timestamp } = data;
      const sql = `INSERT OR REPLACE INTO private_chat_messages (id, chat_id, from_user, to_user, from_name, text, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
      console.log(`[DEBUG] Saving private message from ${from_name} to ${to_user}: ${text.substring(0, 50)}...`);
      db.getDb().run(sql, [id, chat_id, from_user, to_user, from_name, text, timestamp], function(err) {
        if (err) {
          console.error('[DEBUG] Error saving private message:', err);
          reject(err);
        } else {
          console.log(`[DEBUG] Private message saved successfully, id: ${id}`);
          resolve({ id, ...data });
        }
      });
    });
  },
  getByChat: (chatId) => {
    return new Promise((resolve, reject) => {
      db.getDb().all(`SELECT * FROM private_chat_messages WHERE chat_id = ? ORDER BY timestamp ASC`, [chatId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Game categories
const GameCategory = {
  set: (gameId, category) => {
    return new Promise((resolve, reject) => {
      let sql;
      if (isPostgres) {
        sql = `INSERT INTO game_categories (game_id, category) VALUES ($1, $2) ON CONFLICT (game_id) DO UPDATE SET category = EXCLUDED.category`;
      } else {
        sql = `INSERT OR REPLACE INTO game_categories (game_id, category) VALUES (?, ?)`;
      }
      db.getDb().run(sql, [gameId, category], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.getDb().all(`SELECT * FROM game_categories`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Game ratings and summary
const GameRating = {
  add: (gameId, userId, rating) => {
    return new Promise((resolve, reject) => {
      db.getDb().run(
        `INSERT INTO game_ratings (game_id, user_id, rating) VALUES (?, ?, ?)`,
        [gameId, userId, rating],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, gameId, userId, rating });
        }
      );
    });
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.getDb().all(`SELECT * FROM game_ratings`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

const GameRatingSummary = {
  set: (gameId, average, count, total) => {
    return new Promise((resolve, reject) => {
      let sql;
      if (isPostgres) {
        sql = `INSERT INTO game_rating_summary (game_id, average, count, total) VALUES ($1, $2, $3, $4)
               ON CONFLICT (game_id) DO UPDATE SET average = EXCLUDED.average, count = EXCLUDED.count, total = EXCLUDED.total`;
      } else {
        sql = `INSERT OR REPLACE INTO game_rating_summary (game_id, average, count, total) VALUES (?, ?, ?, ?)`;
      }
      db.getDb().run(sql, [gameId, average || 0, count || 0, total || 0], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.getDb().all(`SELECT * FROM game_rating_summary`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Game reviews
const GameReview = {
  add: (data) => {
    return new Promise((resolve, reject) => {
      const { id, game_id, author, rating, text, timestamp } = data;
      let sql;
      if (isPostgres) {
        sql = `INSERT INTO game_reviews (id, game_id, author, rating, text, timestamp) VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (id) DO UPDATE SET game_id = EXCLUDED.game_id, author = EXCLUDED.author, rating = EXCLUDED.rating,
               text = EXCLUDED.text, timestamp = EXCLUDED.timestamp`;
      } else {
        sql = `INSERT OR REPLACE INTO game_reviews (id, game_id, author, rating, text, timestamp) VALUES (?, ?, ?, ?, ?, ?)`;
      }
      db.getDb().run(sql, [id, game_id, author, rating, text, timestamp], function(err) {
        if (err) reject(err);
        else resolve({ id, ...data });
      });
    });
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.getDb().all(`SELECT * FROM game_reviews`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Game stats
const GameStat = {
  set: (data) => {
    return new Promise((resolve, reject) => {
      const { game_id, embed, title, clicks, first_clicked, last_clicked } = data;
      let sql;
      if (isPostgres) {
        sql = `INSERT INTO game_stats (game_id, embed, title, clicks, first_clicked, last_clicked) VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (game_id) DO UPDATE SET embed = EXCLUDED.embed, title = EXCLUDED.title, clicks = EXCLUDED.clicks,
               first_clicked = EXCLUDED.first_clicked, last_clicked = EXCLUDED.last_clicked`;
      } else {
        sql = `INSERT OR REPLACE INTO game_stats (game_id, embed, title, clicks, first_clicked, last_clicked) VALUES (?, ?, ?, ?, ?, ?)`;
      }
      db.getDb().run(sql, [game_id, embed, title, clicks || 0, first_clicked || null, last_clicked || null], function(err) {
        if (err) reject(err);
        else resolve({ game_id, ...data });
      });
    });
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.getDb().all(`SELECT * FROM game_stats`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

module.exports = {
  ContactMessage,
  ChatMessage,
  OnlineUser,
  VisitorStats,
  BannedUser,
  ModerationSettings,
  ProfanityWord,
  ModerationStats,
  Friend,
  UserProfile,
  Canvas,
  TypingIndicator,
  FriendRequest,
  PrivateChatMessage,
  GameCategory,
  GameRating,
  GameRatingSummary,
  GameReview,
  GameStat
};

