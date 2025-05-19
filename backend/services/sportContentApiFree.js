// backend/services/sportContentApiFree.js
import axios from 'axios';

const HOST = process.env.RAPIDAPI_HOST;   // golf-leaderboard-data.p.rapidapi.com
const KEY  = process.env.RAPIDAPI_KEY;

const headers = {
  'X-RapidAPI-Key': KEY,
  'X-RapidAPI-Host': HOST
};

// simple in-memory cache
let cache = {
  tournamentId: null,
  leaderboard: null,
  lastFetch: 0
};

// refresh every 3 hours to stay under 250 calls/mo
const REFRESH_INTERVAL = 3 * 60 * 60 * 1000;

export async function getLeaderboard() {
  const now = Date.now();
  // if empty or stale, re-fetch
  if (!cache.leaderboard || now - cache.lastFetch > REFRESH_INTERVAL) {
    // 1) seed tournamentId once
    if (!cache.tournamentId) {
      // a) get all tours
      const toursRes = await axios.get(
        `https://${HOST}/tours`,
        { headers }
      );
      const tours = toursRes.data.results;
      // b) pick the active PGA Tour for current year
      const pga = tours.find(t =>
        t.active === 1 &&
        /pga tour/i.test(t.tour_name) &&
        t.season_id === new Date().getFullYear()
      );
      // c) get fixtures for that tour/season
      const fixturesRes = await axios.get(
        `https://${HOST}/fixtures/${pga.tour_id}/${pga.season_id}`,
        { headers }
      );
      const fixtures = fixturesRes.data;
      // d) pick the next upcoming event
      const next = fixtures.find(f => new Date(f.start_date) > new Date());
      cache.tournamentId = next.fixture_id;
    }

    // 2) fetch the leaderboard + cut line
    const lbRes = await axios.get(
      `https://${HOST}/leaderboard/${cache.tournamentId}`,
      { headers }
    );
    cache.leaderboard = lbRes.data;
    cache.lastFetch   = now;
  }

  return cache.leaderboard;
}
