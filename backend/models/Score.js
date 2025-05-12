// backend/models/Score.js
import mongoose from 'mongoose';

const ScoreSchema = new mongoose.Schema({
  golfer:    { type: String, required: true },
  strokes:   { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Score', ScoreSchema);
