/**
 * Import a Firebase Realtime Database export (JSON) into the local SQLite backend.
 *
 * Usage (from backend/):
 *   node scripts/import-firebase.js ../firebase-export.json
 */

const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const {
  ChatMessage,
  BannedUser,
  UserProfile,
  Friend,
  VisitorStats,
  ContactMessage,
  TypingIndicator,
  FriendRequest,
  PrivateChatMessage,
  GameCategory,
  GameRating,
  GameRatingSummary,
  GameReview,
  GameStat,
  ModerationSettings,
  ModerationStats,
  OnlineUser
} = require('../database/models');

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node scripts/import-firebase.js <firebase-export.json>');
    process.exit(1);
  }

  const absPath = path.resolve(jsonPath);
  if (!fs.existsSync(absPath)) {
    console.error('File not found:', absPath);
    process.exit(1);
  }

  console.log('Reading Firebase export:', absPath);
  const raw = fs.readFileSync(absPath, 'utf-8');
  const data = JSON.parse(raw);

  await db.init();

  const stats = {
    chatImported: 0,
    typingImported: 0,
    bannedImported: 0,
    contactsImported: 0,
    profilesImported: 0,
    friendsImported: 0,
    friendReqImported: 0,
    privateMsgsImported: 0,
    gameCatImported: 0,
    gameRatingImported: 0,
    gameReviewImported: 0,
    gameStatImported: 0,
    moderationSettingsImported: 0,
    moderationStatsImported: 0,
    onlineImported: 0
  };

  // Chat messages
  if (data.chat && typeof data.chat === 'object') {
    for (const [id, msg] of Object.entries(data.chat)) {
      if (!msg) continue;
      try {
        await ChatMessage.create({
          id,
          user: msg.user || 'Anonymous',
          text: msg.text || '',
          color: msg.color || '#ffffff',
          time: msg.time || Date.now(),
          uid: msg.uid || 'unknown',
          avatar: msg.avatar || '',
          avatarImage: msg.avatarImage || null,
          reactions: msg.reactions || {}
        });
        stats.chatImported++;
      } catch (err) {
        console.warn('Skipping chat message', id, err.message);
      }
    }
  }

  // Typing indicators
  if (data.chatTyping && typeof data.chatTyping === 'object') {
    for (const [visitorId, username] of Object.entries(data.chatTyping)) {
      if (!visitorId) continue;
      try {
        await TypingIndicator.set(visitorId, username || 'Anonymous');
        stats.typingImported++;
      } catch (err) {
        console.warn('Skipping typing indicator', visitorId, err.message);
      }
    }
  }

  // Banned users
  if (data.bannedUsers && typeof data.bannedUsers === 'object') {
    for (const [uid, ban] of Object.entries(data.bannedUsers)) {
      if (!ban) continue;
      try {
        await BannedUser.create({
          uid,
          username: ban.username || 'Unknown',
          reason: ban.reason || 'Imported',
          banned_by: ban.banned_by || 'import',
          banned_at: ban.banned_at || Date.now(),
          expires_at: ban.expires_at || null
        });
        stats.bannedImported++;
      } catch (err) {
        console.warn('Skipping banned user', uid, err.message);
      }
    }
  }

  // Contact messages
  if (data.contactMessages && typeof data.contactMessages === 'object') {
    for (const [id, msg] of Object.entries(data.contactMessages)) {
      if (!msg) continue;
      try {
        await ContactMessage.create({
          id,
          name: msg.name || 'Unknown',
          email: msg.email || '',
          subject: msg.subject || '',
          message: msg.message || '',
          timestamp: msg.timestamp || Date.now(),
          date: msg.date || new Date().toISOString()
        });
        stats.contactsImported++;
      } catch (err) {
        console.warn('Skipping contact message', id, err.message);
      }
    }
  }

  // Profiles
  if (data.profiles && typeof data.profiles === 'object') {
    for (const [uid, profile] of Object.entries(data.profiles)) {
      if (!profile) continue;
      try {
        await UserProfile.set(uid, {
          username: profile.username || 'User',
          avatar: profile.avatar || '',
          avatarImage: profile.avatarImage || null,
          color: profile.color || '#ffffff',
          status: profile.status || ''
        });
        stats.profilesImported++;
      } catch (err) {
        console.warn('Skipping profile', uid, err.message);
      }
    }
  }

  // Friends
  if (data.friends && typeof data.friends === 'object') {
    for (const [uid, friends] of Object.entries(data.friends)) {
      if (friends && typeof friends === 'object') {
        for (const friendId of Object.keys(friends)) {
          try {
            await Friend.add(uid, friendId);
            stats.friendsImported++;
          } catch (err) {
            console.warn('Skipping friend link', uid, friendId, err.message);
          }
        }
      }
    }
  }

  // Friend requests
  if (data.friendRequests && typeof data.friendRequests === 'object') {
    for (const [uid, reqs] of Object.entries(data.friendRequests)) {
      if (!reqs) continue;
      if (reqs.sent && typeof reqs.sent === 'object') {
        for (const [toUser, meta] of Object.entries(reqs.sent)) {
          try {
            await FriendRequest.add(uid, toUser, 'sent', meta?.timestamp || Date.now());
            stats.friendReqImported++;
          } catch (err) {
            console.warn('Skipping friend request (sent)', uid, toUser, err.message);
          }
        }
      }
      if (reqs.received && typeof reqs.received === 'object') {
        for (const [fromUser, meta] of Object.entries(reqs.received)) {
          try {
            await FriendRequest.add(fromUser, uid, 'received', meta?.timestamp || Date.now());
            stats.friendReqImported++;
          } catch (err) {
            console.warn('Skipping friend request (received)', fromUser, uid, err.message);
          }
        }
      }
    }
  }

  // Private chats
  if (data.privateChats && typeof data.privateChats === 'object') {
    for (const [chatId, chatObj] of Object.entries(data.privateChats)) {
      if (!chatObj || !chatObj.messages) continue;
      for (const [msgId, msg] of Object.entries(chatObj.messages)) {
        try {
          await PrivateChatMessage.add({
            id: msgId,
            chat_id: chatId,
            from_user: msg.from || 'unknown',
            to_user: msg.to || 'unknown',
            from_name: msg.fromName || 'Unknown',
            text: msg.text || '',
            timestamp: msg.timestamp || Date.now()
          });
          stats.privateMsgsImported++;
        } catch (err) {
          console.warn('Skipping private chat message', msgId, err.message);
        }
      }
    }
  }

  // Game categories
  if (data.gameCategories && typeof data.gameCategories === 'object') {
    for (const [gameId, category] of Object.entries(data.gameCategories)) {
      try {
        await GameCategory.set(gameId, category || '');
        stats.gameCatImported++;
      } catch (err) {
        console.warn('Skipping game category', gameId, err.message);
      }
    }
  }

  // Game ratings and summary
  if (data.gameRatings && typeof data.gameRatings === 'object') {
    for (const [gameId, ratingObj] of Object.entries(data.gameRatings)) {
      try {
        const ratings = ratingObj.ratings || {};
        for (const [userId, value] of Object.entries(ratings)) {
          await GameRating.add(gameId, userId, value || 0);
          stats.gameRatingImported++;
        }
        await GameRatingSummary.set(gameId, ratingObj.average || 0, ratingObj.count || 0, ratingObj.total || 0);
      } catch (err) {
        console.warn('Skipping game rating', gameId, err.message);
      }
    }
  }

  // Game reviews
  if (data.gameReviews && typeof data.gameReviews === 'object') {
    for (const [gameId, reviews] of Object.entries(data.gameReviews)) {
      if (!reviews || typeof reviews !== 'object') continue;
      for (const [id, rev] of Object.entries(reviews)) {
        try {
          await GameReview.add({
            id,
            game_id: gameId,
            author: rev.author || 'Anonymous',
            rating: rev.rating || null,
            text: rev.text || '',
            timestamp: rev.timestamp || Date.now()
          });
          stats.gameReviewImported++;
        } catch (err) {
          console.warn('Skipping game review', id, err.message);
        }
      }
    }
  }

  // Game stats
  if (data.gameStats && typeof data.gameStats === 'object') {
    for (const [gameId, stat] of Object.entries(data.gameStats)) {
      if (!stat) continue;
      try {
        await GameStat.set({
          game_id: gameId,
          embed: stat.embed || '',
          title: stat.title || '',
          clicks: stat.clicks || 0,
          first_clicked: stat.firstClicked || null,
          last_clicked: stat.lastClicked || null
        });
        stats.gameStatImported++;
      } catch (err) {
        console.warn('Skipping game stat', gameId, err.message);
      }
    }
  }

  // Moderation settings
  if (data.moderationSettings && typeof data.moderationSettings === 'object') {
    for (const [key, value] of Object.entries(data.moderationSettings)) {
      try {
        await ModerationSettings.set(key, value);
        stats.moderationSettingsImported++;
      } catch (err) {
        console.warn('Skipping moderation setting', key, err.message);
      }
    }
  }

  // Moderation stats
  if (data.moderationStats && typeof data.moderationStats === 'object') {
    const mStats = {
      blocked_messages: data.moderationStats.blockedMessages || 0,
      banned_users: data.moderationStats.bannedUsers || 0,
      active_users: data.moderationStats.activeUsers || 0
    };
    try {
      await ModerationStats.update(mStats);
      stats.moderationStatsImported++;
    } catch (err) {
      console.warn('Skipping moderation stats', err.message);
    }
  }

  // Online snapshot (optional)
  if (data.online && typeof data.online === 'object') {
    for (const [visitorId, info] of Object.entries(data.online)) {
      try {
        await OnlineUser.setOnline(visitorId, info?.username || 'Anonymous');
        stats.onlineImported++;
      } catch (err) {
        console.warn('Skipping online user', visitorId, err.message);
      }
    }
  }

  // Visitor stats
  if (typeof data.totalVisitors === 'number') {
    try {
      await VisitorStats.set(data.totalVisitors);
      console.log('Set totalVisitors to', data.totalVisitors);
    } catch (err) {
      console.warn('Could not set totalVisitors:', err.message);
    }
  }

  console.log('Import complete:', stats);

  await db.close();
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
