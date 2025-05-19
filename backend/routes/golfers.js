// backend/routes/golfers.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// GET /api/golfers/current
// Returns the full PGA event field (golfer IDs + names) with Entry List
router.get('/current', async (req, res) => {
  try {
    const { RAPIDAPI_KEY: KEY, RAPIDAPI_HOST: HOST } = process.env;
    const headers = {
      'X-RapidAPI-Key': KEY,
      'X-RapidAPI-Host': HOST
    };

    console.log('🔍 [golfers] Starting fetch of entry list');

    // 1) Find PGA Tour + current season
    const toursRes = await axios.get(`https://${HOST}/tours`, { headers });
    const tours = toursRes.data.results;
    const pgaTour = tours.find(t =>
      t.active === 1 && /pga tour/i.test(t.tour_name) && t.season_id === new Date().getFullYear()
    );
    if (!pgaTour) throw new Error('PGA Tour not found');
    console.log('🔍 [golfers] pgaTour:', pgaTour);

    // 2) Fetch fixtures and pick next event
    const fixturesRes = await axios.get(
      `https://${HOST}/fixtures/${pgaTour.tour_id}/${pgaTour.season_id}`,
      { headers }
    );
    let fixtures = fixturesRes.data;
    if (!Array.isArray(fixtures)) fixtures = fixtures.results || fixtures.data || [];
    if (!fixtures.length) throw new Error('No upcoming tournament found');
    const nextEvent = fixtures.find(f => new Date(f.start_date) > new Date());
    if (!nextEvent) throw new Error('No upcoming tournament found');
    const fixtureId = nextEvent.fixture_id || nextEvent.id;
    console.log('🔍 [golfers] fixtureId:', fixtureId);

    // 3) Fetch leaderboard to get tournament ID for Entry List
    const lbRes = await axios.get(
      `https://${HOST}/leaderboard/${fixtureId}`,
      { headers }
    );
    const tournamentId = lbRes.data.results?.tournament?.id;
    if (!tournamentId) throw new Error('No tournament ID for entry list');
    console.log('🔍 [golfers] tournamentId:', tournamentId);

    // 4) Call Entry List endpoint for full field via query param
    const entryRes = await axios.get(
      `https://${HOST}/entry_list`,
      { headers, params: { tournament_id: tournamentId } }
    );
    const results = entryRes.data.results;
    const rawList = Array.isArray(results.entry_list)
      ? results.entry_list
      : Array.isArray(results.entry_list_array)
      ? results.entry_list_array
      : [];
    console.log('🔍 [golfers] rawList length:', rawList.length);

    // 5) Normalize field: player_id + first/last
    const field = rawList.map(p => ({
      id:   p.player_id.toString(),
      name: `${p.first_name} ${p.last_name}`
    }));

    // 6) Tournament name
    const tournamentName = entryRes.data.meta?.title || nextEvent.name || 'PGA Event';
    console.log('🔍 [golfers] Returning field, count:', field.length);

    return res.json({ tournament: tournamentName, field });
  } catch (err) {
    console.error('❌ [GET /api/golfers/current] FULL ERROR:', err);
    return res.status(500).json({ msg: 'Unable to load tournament field' });
  }
});

export default router;
