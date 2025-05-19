// backend/services/sportContentApiFree.js
import axios from 'axios';

const HOST = process.env.RAPIDAPI_HOST;   // golf-leaderboard-data.p.rapidapi.com
const KEY  = process.env.RAPIDAPI_KEY;

const headers = {
  'X-RapidAPI-Key': KEY,
  'X-RapidAPI-Host': HOST
};

// Simple in-memory cache for tournamentId & leaderboard
let cache = {
  tournamentId: null,
  leaderboard: null,
  lastFetch: 0
};

// Refresh interval: 3 hours (ms)
const REFRESH_INTERVAL = 3 * 60 * 60 * 1000;

export async function getLeaderboard() {
  const now = Date.now();

  // If no cache or cache expired, re-fetch
  if (!cache.leaderboard || now - cache.lastFetch > REFRESH_INTERVAL) {
    // 1) Seed tournamentId once
    if (!cache.tournamentId) {
      // a) Fetch all tours
      const toursRes = await axios.get(
        `https://${HOST}/tours`,
        { headers }
      );
      const tours = toursRes.data.results;

      // b) Pick the active PGA Tour for the current year
      const pga = tours.find(t =>
        t.active === 1 &&
        /pga tour/i.test(t.tour_name) &&
        t.season_id === new Date().getFullYear()
      );
      if (!pga) throw new Error('PGA Tour not found in tours list');

      // c) Fetch fixtures for that tour/season
      const fixturesRes = await axios.get(
        `https://${HOST}/fixtures/${pga.tour_id}/${pga.season_id}`,
        { headers }
      );
      // Fixtures may be at data.results or data
      const fixturesData = fixturesRes.data;
      const fixtures = Array.isArray(fixturesData)
        ? fixturesData
        : fixturesData.results ?? [];
      if (!fixtures.length) throw new Error('No fixtures returned');

      // d) Pick the next upcoming event
      const next = fixtures.find(f => new Date(f.start_date) > new Date());
      if (!next) throw new Error('No upcoming event found');
      cache.tournamentId = next.fixture_id;
    }

    // 2) Fetch leaderboard + cut line for the seeded tournamentId
    const lbRes = await axios.get(
      `https://${HOST}/leaderboard/${cache.tournamentId}`,
      { headers }
    );
    cache.leaderboard = lbRes.data;
    cache.lastFetch   = now;
  }

  return cache.leaderboard;
}