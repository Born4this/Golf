// backend/routes/golfers.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// Simple in‐memory cache for the field endpoint
let cachedField = null;
let lastFetchTime = 0;
const FIELD_TTL = 30 * 60 * 1000; // 5 minutes

// GET /api/golfers/current
// Returns the PGA event field (golfer IDs + names), keeping last week's event
// on Mondays until 11:59 PM
router.get('/current', async (req, res) => {
  try {
    const nowMs = Date.now();
    if (cachedField && nowMs - lastFetchTime < FIELD_TTL) {
      // serve from cache if fresh
      return res.json(cachedField);
    }

    const { RAPIDAPI_KEY: KEY, RAPIDAPI_HOST: HOST } = process.env;
    if (!KEY || !HOST) throw new Error('RapidAPI credentials not set');
    const headers = {
      'X-RapidAPI-Key': KEY,
      'X-RapidAPI-Host': HOST
    };

    console.log('🔍 [golfers] Starting fetch of entry list');

    // 1) Fetch tours + pick PGA Tour
    const toursRes = await axios.get(`https://${HOST}/tours`, { headers });
    const tours = toursRes.data.results || [];
    const pgaTour = tours.find(
      t => t.active === 1 &&
           /pga tour/i.test(t.tour_name) &&
           t.season_id === new Date().getFullYear()
    );
    if (!pgaTour) throw new Error('PGA Tour not found');

    // 2) Fetch fixtures for this tour/season
    const fxRes = await axios.get(
      `https://${HOST}/fixtures/${pgaTour.tour_id}/${pgaTour.season_id}`,
      { headers }
    );
    let fixtures = fxRes.data;
    if (!Array.isArray(fixtures)) fixtures = fixtures.results || fixtures.data || [];
    if (!fixtures.length) throw new Error('No fixtures returned');

    const now = new Date();
    let selectedEvent = null;

    // Monday logic: keep last finished event until 11:59 PM
    if (now.getDay() === 1) {
      const past = fixtures
        .filter(f => f.end_date && new Date(f.end_date) < now)
        .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
      if (past.length) {
        selectedEvent = past[0];
        console.log('🔍 [golfers] Using previous event on Monday:', selectedEvent.name);
      }
    }

    // Otherwise (or if none found), pick next upcoming
    if (!selectedEvent) {
      const future = fixtures
        .filter(f => new Date(f.start_date) > now)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      selectedEvent = future[0];
      console.log('🔍 [golfers] Using next event:', selectedEvent?.name);
    }
    if (!selectedEvent) throw new Error('No suitable tournament found');

    const fixtureId = selectedEvent.fixture_id || selectedEvent.id;

    // 3) Fetch leaderboard to get tournament ID
    const lbRes = await axios.get(
      `https://${HOST}/leaderboard/${fixtureId}`,
      { headers }
    );
    const tournamentId = lbRes.data.results?.tournament?.id;
    if (!tournamentId) throw new Error('No tournament ID for entry list');

    // 4) Call Entry List endpoint (note underscore!)
    const entryRes = await axios.get(
      `https://${HOST}/entry_list/${tournamentId}`,
      { headers }
    );
    const results = entryRes.data.results || {};
    const rawList = Array.isArray(results.entry_list_array)
      ? results.entry_list_array
      : Array.isArray(results.entry_list)
        ? results.entry_list
        : [];
    console.log('🔍 [golfers] rawList length:', rawList.length);

    // 5) Normalize field
    const field = rawList.map(p => ({
      id:   p.player_id.toString(),
      name: `${p.first_name} ${p.last_name}`
    }));

    // 6) Tournament name
    const tournamentName = entryRes.data.meta?.title || selectedEvent.name;
    console.log('🔍 [golfers] field length:', field.length);

    // Cache & return
    cachedField    = { tournament: tournamentName, field };
    lastFetchTime  = nowMs;
    res.json(cachedField);
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] ERROR:', err.message);
    res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;
