import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  password:  { type: String, required: true },        // hashed
  username:  { type: String, required: true, unique: true },
  createdAt: { type: Date,   default: Date.now }
});

const User = mongoose.model('User', UserSchema);
export default User;

