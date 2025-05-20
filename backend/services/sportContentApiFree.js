// backend/services/sportContentApiFree.js – ESPN version
import axios from 'axios'

// ESPN’s public golf API base
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga'

// Simple in‑memory cache so we only hit ESPN a handful of times per day
const cache = {
  eventId: null,     // ESPN event UID for the selected tournament
  leaderboard: null, // Cached leaderboard JSON
  lastFetch: 0       // UNIX ms of last successful refresh
}

// Refresh every 3 hours (matches your RapidAPI logic)
const REFRESH_INTERVAL = 3 * 60 * 60 * 1000

/**
 * Fetches ESPN’s schedule and picks a tournament ID to track.
 *  – On Mondays → most recently finished event
 *  – Any other day → next upcoming event
 */
async function pickEventId () {
  const res = await axios.get(`${BASE}/schedule`)
  const events = res.data?.events ?? []
  if (!events.length) throw new Error('No PGA events returned by ESPN')

  // Extract id + dates in a uniform shape
  const parsed = events
    .map(e => {
      const id        = e.id || e.uid || null
      const startDate = new Date(e.date || e.startDate || e.start || e.season?.startDate || null)
      const endDate   = new Date(e.endDate || e.links?.find(l => l.rel?.includes('end'))?.href || e.date || null)
      return id && !isNaN(startDate) ? { id, startDate, endDate } : null
    })
    .filter(Boolean)

  if (!parsed.length) throw new Error('Could not parse ESPN event dates')

  const now     = new Date()
  let   chosen  = null

  if (now.getDay() === 1) {
    // Monday → pick most recently finished event
    const past = parsed
      .filter(ev => ev.endDate && ev.endDate < now)
      .sort((a, b) => b.endDate - a.endDate)
    if (past.length) chosen = past[0]
  }

  // Otherwise pick the next upcoming event
  if (!chosen) {
    const upcoming = parsed
      .filter(ev => ev.startDate > now)
      .sort((a, b) => a.startDate - b.startDate)
    if (upcoming.length) chosen = upcoming[0]
  }

  // Fallback to first event in the list (shouldn’t normally happen)
  if (!chosen) chosen = parsed[0]

  return chosen.id
}

/**
 * Returns the cached leaderboard; refreshes from ESPN if cache expired.
 */
export async function getLeaderboard () {
  const now = Date.now()

  // Cache miss or TTL expired → refresh
  if (!cache.leaderboard || now - cache.lastFetch > REFRESH_INTERVAL) {
    // Pick or re‑pick the event ID if we don’t have one yet
    if (!cache.eventId) {
      cache.eventId = await pickEventId()
    }

    try {
      const lbRes = await axios.get(`${BASE}/leaderboard`, {
        params: { event: cache.eventId }
      })
      cache.leaderboard = lbRes.data
      cache.lastFetch   = now
    } catch (err) {
      // If the event ID is stale, try re‑picking once and retrying
      console.warn('ESPN fetch failed, retrying with new event ID:', err.message)
      cache.eventId = await pickEventId()
      const retry   = await axios.get(`${BASE}/leaderboard`, {
        params: { event: cache.eventId }
      })
      cache.leaderboard = retry.data
      cache.lastFetch   = now
    }
  }

  return cache.leaderboard
}

// Optional helper: expose current event ID for diagnostic
export function currentEventId () {
  return cache.eventId
}
