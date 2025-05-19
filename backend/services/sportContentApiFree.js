// backend/services/sportContentApiFree.js
import axios from 'axios';

const HOST = process.env.RAPIDAPI_HOST;   // e.g. golf-leaderboard-data.p.rapidapi.com
const KEY  = process.env.RAPIDAPI_KEY;

const headers = {
  'X-RapidAPI-Key': KEY,
  'X-RapidAPI-Host': HOST
};

/**
 * Determine the appropriate fixture ID:
 * - On Monday until 11:59PM: use last finished event
 * - Otherwise: use next upcoming event
 */
async function pickFixtureId() {
  // 1) Fetch tours
  const toursRes = await axios.get(`https://${HOST}/tours`, { headers });
  const tours = toursRes.data.results || [];
  const pga = tours.find(t =>
    t.active === 1 && /pga tour/i.test(t.tour_name) && t.season_id === new Date().getFullYear()
  );
  if (!pga) throw new Error('PGA Tour not found');

  // 2) Fetch fixtures
  const fxRes = await axios.get(
    `https://${HOST}/fixtures/${pga.tour_id}/${pga.season_id}`,
    { headers }
  );
  let fixtures = fxRes.data;
  if (!Array.isArray(fixtures)) fixtures = fixtures.results || fixtures.data || [];
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    throw new Error('No fixtures returned');
  }

  const now = new Date();
  let chosen;

  // Monday logic: get most recent past event
  if (now.getDay() === 1) {
    const past = fixtures
      .filter(f => f.end_date && new Date(f.end_date) < now)
      .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
    if (past.length) {
      chosen = past[0];
    }
  }

  // default: next upcoming event
  if (!chosen) {
    chosen = fixtures
      .filter(f => new Date(f.start_date) > now)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
  }

  if (!chosen) throw new Error('No suitable tournament found');
  return chosen.fixture_id ?? chosen.id;
}

/**
 * Fetches leaderboard data for the current (or last) PGA event
 * Applies Monday logic to keep last week’s tournament on Mondays
 */
export async function getLeaderboard() {
  // 1) Pick fixture ID dynamically each call
  const fixtureId = await pickFixtureId();

  // 2) Fetch leaderboard
  const lbRes = await axios.get(
    `https://${HOST}/leaderboard/${fixtureId}`,
    { headers }
  );
  const raw = lbRes.data;

  // 3) Normalize shape: prefer raw.results
  return raw.results ?? raw;
}
