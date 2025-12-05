const fs = require('fs');

// Clean Firebase export by removing image data to reduce file size
function cleanFirebaseExport() {
  const inputFile = 'firebase_export.json';
  const outputFile = 'firebase_export_clean.json';

  console.log('Reading Firebase export...');
  const raw = fs.readFileSync(inputFile, 'utf8');
  const data = JSON.parse(raw);

  console.log('Cleaning image data...');

  // Remove avatarImage from chat messages
  if (data.chat) {
    for (const id in data.chat) {
      if (data.chat[id].avatarImage) {
        delete data.chat[id].avatarImage;
      }
    }
  }

  // Remove avatarImage from profiles
  if (data.profiles) {
    for (const userId in data.profiles) {
      if (data.profiles[userId].avatarImage) {
        delete data.profiles[userId].avatarImage;
      }
    }
  }

  // Remove any other image fields if they exist
  // Add more cleaning as needed

  console.log('Writing cleaned export...');
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));

  const stats = fs.statSync(outputFile);
  console.log(`✅ Cleaned export saved as ${outputFile}`);
  console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

cleanFirebaseExport();