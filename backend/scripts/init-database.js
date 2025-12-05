const db = require('../database/db');

async function init() {
  try {
    console.log('Initializing database...');
    await db.init();
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

init();

