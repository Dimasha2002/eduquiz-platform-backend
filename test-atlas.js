import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testAtlasConnection = async () => {
  try {
    console.log('🔍 Testing MongoDB Atlas Connection...\n');
    
    const uri = process.env.MONGODB_URI;
    console.log('Connection URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    console.log('');
    
    console.log('⏳ Attempting to connect...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    
    console.log('✅ Successfully connected to MongoDB Atlas!\n');
    
    const db = mongoose.connection.db;
    console.log('Database:', db.databaseName);
    console.log('Host:', mongoose.connection.host);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections found:', collections.length);
    collections.forEach(c => console.log('  -', c.name));
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test successful!');
    
  } catch (error) {
    console.error('❌ Connection FAILED!');
    console.error('Error:', error.message);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.error('\n⚠️  Network issue detected. Possible causes:');
      console.error('   1. IP address not whitelisted in MongoDB Atlas');
      console.error('   2. Network/firewall blocking the connection');
      console.error('   3. Incorrect connection string');
    }
    
    process.exit(1);
  }
};

testAtlasConnection();
