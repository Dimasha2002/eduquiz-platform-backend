import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const verifyDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Connection String:', process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully\n');

    // Get database name
    const dbName = mongoose.connection.db.databaseName;
    console.log('📊 Database Name:', dbName);

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    
    if (collections.length === 0) {
      console.log('   ⚠️  No collections found! Database is empty.');
    } else {
      for (const collection of collections) {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        console.log(`   - ${collection.name}: ${count} documents`);
      }
    }

    // Show connection details
    console.log('\n🔗 Connection Details:');
    console.log('   Host:', mongoose.connection.host);
    console.log('   Port:', mongoose.connection.port);
    console.log('   Database:', mongoose.connection.name);

    await mongoose.connection.close();
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

verifyDatabase();
