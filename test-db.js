const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔄 Attempting to connect to MongoDB...');

mongoose.connect(process.env.MONGODB_URI)
  .then((conn) => {
    console.log('========================================');
    console.log('🎉 YES! MongoDB is CONNECTED SUCCESSFULLY!');
    console.log(`📡 Connected Host: ${conn.connection.host}`);
    console.log(`🗄️  Database Name: ${conn.connection.name}`);
    console.log(`⚡ Ready State: ${conn.connection.readyState} (1 = connected)`);
    console.log('========================================');
    process.exit(0);
  })
  .catch((err) => {
    console.log('========================================');
    console.log('❌ FAILED to connect to MongoDB!');
    console.log(`Error: ${err.message}`);
    console.log('========================================');
    process.exit(1);
  });

