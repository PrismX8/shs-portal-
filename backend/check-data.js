const db = require('./database/db');

async function checkData() {
  try {
    await db.init();
    const sqlite3 = require('sqlite3').verbose();
    const database = new sqlite3.Database('./data/database.db');

    // Check chat messages
    database.all('SELECT COUNT(*) as count FROM chat_messages', (err, rows) => {
      if (err) console.error('Error counting chat messages:', err);
      else console.log('Chat messages count:', rows[0].count);
    });

    // Check private chat messages
    database.all('SELECT COUNT(*) as count FROM private_chat_messages', (err, rows) => {
      if (err) console.error('Error counting private messages:', err);
      else console.log('Private chat messages count:', rows[0].count);
    });

    // Check user profiles
    database.all('SELECT COUNT(*) as count FROM user_profiles', (err, rows) => {
      if (err) console.error('Error counting profiles:', err);
      else console.log('User profiles count:', rows[0].count);
    });

    // Close after a delay
    setTimeout(() => {
      database.close();
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();