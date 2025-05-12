// backend/models/League.js
import mongoose from 'mongoose';

const DraftPickSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  golfer:     { type: String, required: true },    // ESPN golfer ID
  golferName: { type: String, required: true },    // Display name
  round:      { type: Number, required: true },    // 1–4
  pickNo:     { type: Number, required: true }     // overall pick sequence
});

const LeagueSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  code:         { type: String, required: true, unique: true },
  admin:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamCount:    { type: Number, required: true, min: 2, max: 6 },
  members:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  cutHandling:  { type: String, enum: ['standard', 'cap'], default: 'standard' },
  draftOrder:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  draftPicks:   [DraftPickSchema],
  createdAt:    { type: Date, default: Date.now }
});

export default mongoose.model('League', LeagueSchema);
