// Script to check MongoDB collections
import 'dotenv/config';
import mongoose from 'mongoose';
import '../src/schemas/index.js'; // Load all schemas

const checkDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get the database instance
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Current Collections in Database:');
    
    if (collections.length === 0) {
      console.log('  - No collections found');
    } else {
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`  - ${collection.name}: ${count} documents`);
      }
    }

    // Check if Room model is registered
    const models = mongoose.models;
    console.log('\n🏗️  Registered Mongoose Models:');
    Object.keys(models).forEach(modelName => {
      console.log(`  - ${modelName}`);
    });

    // Test creating a room to trigger collection creation
    console.log('\n🧪 Testing Room model...');
    const Room = mongoose.model('Room');
    
    // This will create the collection if it doesn't exist
    const testRoomId = Room.generateRoomId();
    console.log(`  - Generated test room ID: ${testRoomId}`);
    
    // Check collections again after model operations
    const collectionsAfter = await db.listCollections().toArray();
    console.log('\n📋 Collections after model operations:');
    
    for (const collection of collectionsAfter) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count} documents`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
};

checkDatabase();
