// backend/routes/golfers.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// GET /api/golfers/current
// Returns the full PGA event field (golfer IDs + names) using Entry List
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
    console.log('🔍 [golfers] toursRes.data:', JSON.stringify(toursRes.data).slice(0,200));
    const tours = toursRes.data.results;
    const pgaTour = tours.find(t =>
      t.active === 1 && /pga tour/i.test(t.tour_name) && t.season_id === new Date().getFullYear()
    );
    console.log('🔍 [golfers] pgaTour:', pgaTour);
    if (!pgaTour) throw new Error('PGA Tour not found');

    // 2) Fetch fixtures and pick next event
    const fixturesRes = await axios.get(
      `https://${HOST}/fixtures/${pgaTour.tour_id}/${pgaTour.season_id}`,
      { headers }
    );
    console.log('🔍 [golfers] fixturesRes.data:', JSON.stringify(fixturesRes.data).slice(0,200));
    let fixtures = fixturesRes.data;
    if (!Array.isArray(fixtures)) fixtures = fixtures.results || fixtures.data || [];
    console.log('🔍 [golfers] normalized fixtures length:', fixtures.length);
    const nextEvent = fixtures.find(f => new Date(f.start_date) > new Date());
    console.log('🔍 [golfers] nextEvent:', nextEvent);
    if (!nextEvent) throw new Error('No upcoming tournament found');
    const fixtureId = nextEvent.fixture_id || nextEvent.id;
    console.log('🔍 [golfers] fixtureId:', fixtureId);

    // 3) Fetch leaderboard to get tournament ID for Entry List
    const lbRes = await axios.get(`https://${HOST}/leaderboard/${fixtureId}`, { headers });
    console.log('🔍 [golfers] lbRes.data.results.tournament:', lbRes.data.results?.tournament);
    const tournamentId = lbRes.data.results?.tournament?.id;
    console.log('🔍 [golfers] tournamentId:', tournamentId);
    if (!tournamentId) throw new Error('No tournament ID for entry list');

    // 4) Call Entry List endpoint for full field
    const entryRes = await axios.get(`https://${HOST}/entry_list/${tournamentId}`, { headers });
    console.log('🔍 [golfers] entryRes.data.meta:', entryRes.data.meta);
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
