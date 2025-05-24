import mongoose from 'mongoose';

async function dropIndex() {
  const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/fantasy-golf';
  await mongoose.connect(MONGO_URI);
  console.log('🔗 Connected to MongoDB');

  try {
    await mongoose.connection.db
      .collection('users')
      .dropIndex('email_1');
    console.log('✅ Dropped index email_1');
  } catch (err) {
    console.error('⚠️  Could not drop email_1 index:', err.message);
  } finally {
    process.exit(0);
  }
}

dropIndex();
