// backend/services/sportContentApiFree.js
import axios from 'axios';

const HOST = process.env.RAPIDAPI_HOST;   // e.g. golf-leaderboard-data.p.rapidapi.com
const KEY  = process.env.RAPIDAPI_KEY;

const headers = {
  'X-RapidAPI-Key': KEY,
  'X-RapidAPI-Host': HOST
};

// In-memory cache: holds tournamentId, leaderboard payload, and last fetch timestamp
const cache = {
  tournamentId: null,
  leaderboard: null,
  lastFetch: 0
};

// Refresh interval for leaderboard data: 3 hours (in milliseconds)
const REFRESH_INTERVAL = 3 * 60 * 60 * 1000;

/**
 * Pick the fixture ID according to:
 *  - Mondays (in Eastern time): most recently finished tournament
 *  - Otherwise: next upcoming tournament
 */
async function pickFixtureId() {
  // 1) Fetch all tours
  const toursRes = await axios.get(`https://${HOST}/tours`, { headers });
  const tours    = toursRes.data.results ?? [];
  const pga      = tours.find(t =>
    t.active === 1 &&
    /pga tour/i.test(t.tour_name) &&
    t.season_id === new Date().getFullYear()
  );
  if (!pga) throw new Error('PGA Tour not found');

  // 2) Fetch fixtures for that tour + season
  const fxRes = await axios.get(
    `https://${HOST}/fixtures/${pga.tour_id}/${pga.season_id}`,
    { headers }
  );
  let fixtures = fxRes.data;
  if (!Array.isArray(fixtures)) fixtures = fixtures.results ?? fixtures.data ?? [];
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    throw new Error('No fixtures returned');
  }

  // compute "now" in Eastern time by subtracting 4h from UTC
  const nowUTC      = Date.now();
  const nowEastern  = new Date(nowUTC - 4 * 60 * 60 * 1000);
  let chosen = null;

  // Monday logic: pick the most recently finished event
  if (nowEastern.getDay() === 1) {
    const past = fixtures
      .filter(f => f.end_date && new Date(f.end_date) < nowEastern)
      .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
    if (past.length) chosen = past[0];
  }

  // Default: pick the next upcoming event
  if (!chosen) {
    chosen = fixtures
      .filter(f => new Date(f.start_date) > nowEastern)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
  }

  if (!chosen) throw new Error('No suitable tournament found');
  return chosen.fixture_id ?? chosen.id;
}

/**
 * Returns the cached leaderboard (with Monday/Eastern logic) if under TTL,
 * otherwise re-fetches and updates the cache.
 */
export async function getLeaderboard() {
  const now = Date.now();

  // If cache is empty or expired, re-fetch everything
  if (!cache.leaderboard || now - cache.lastFetch > REFRESH_INTERVAL) {
    // Always pick the current fixture (handles new tournaments)
    cache.tournamentId = await pickFixtureId();

    // Fetch fresh leaderboard for that tournament
    const lbRes = await axios.get(
      `https://${HOST}/leaderboard/${cache.tournamentId}`,
      { headers }
    );
    const raw = lbRes.data;

    // Normalize into a plain object (unwrapping .results if present)
    cache.leaderboard = raw.results ?? raw;
    cache.lastFetch   = now;
  }

  return cache.leaderboard;
}
