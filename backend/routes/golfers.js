// backend/routes/golfers.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// GET /api/golfers/current
// Returns the PGA event field (golfer IDs + names), keeping last week's event on Mondays until 11:59 PM
router.get('/current', async (req, res) => {
  try {
    const { RAPIDAPI_KEY: KEY, RAPIDAPI_HOST: HOST } = process.env;
    if (!KEY || !HOST) throw new Error('RapidAPI credentials not set');
    const headers = { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': HOST };

    console.log('🔍 [golfers] Starting fetch of entry list');

    // 1) Fetch tours and pick PGA Tour
    const toursRes = await axios.get(`https://${HOST}/tours`, { headers });
    const tours = toursRes.data.results || [];
    const pgaTour = tours.find(t =>
      t.active === 1 && /pga tour/i.test(t.tour_name) && t.season_id === new Date().getFullYear()
    );
    if (!pgaTour) throw new Error('PGA Tour not found');

    // 2) Fetch fixtures for this tour/season
    const fixturesRes = await axios.get(
      `https://${HOST}/fixtures/${pgaTour.tour_id}/${pgaTour.season_id}`,
      { headers }
    );
    let fixtures = fixturesRes.data;
    if (!Array.isArray(fixtures)) fixtures = fixtures.results || fixtures.data || [];
    if (!fixtures.length) throw new Error('No fixtures returned');

    const now = new Date();
    let selectedEvent;

    // On Mondays (day=1), keep last week's event until 11:59 PM
    if (now.getDay() === 1) {
      // Find past events by end_date
      const past = fixtures
        .filter(f => f.end_date && new Date(f.end_date) < now)
        .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
      if (past.length) {
        selectedEvent = past[0];
        console.log('🔍 [golfers] Using previous event on Monday:', selectedEvent.name || selectedEvent.id);
      }
    }

    // Otherwise, or if no past event, pick next upcoming event
    if (!selectedEvent) {
      selectedEvent = fixtures
        .filter(f => new Date(f.start_date) > now)
        .shift();
      console.log('🔍 [golfers] Using next event:', selectedEvent?.name || selectedEvent?.id);
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

    // 4) Call Entry List endpoint
    const entryRes = await axios.get(
      `https://${HOST}/entry-list/${tournamentId}`,
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
      id: p.player_id.toString(),
      name: `${p.first_name} ${p.last_name}`
    }));

    // 6) Determine tournament name
    const tournamentName = entryRes.data.meta?.title || selectedEvent.name;
    console.log('🔍 [golfers] field length:', field.length);

    res.json({ tournament: tournamentName, field });
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] ERROR:', err.message);
    res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;
