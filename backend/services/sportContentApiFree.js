// backend/services/sportContentApiFree.js – ESPN v2 fix (uses universal leaderboard endpoint)
import axios from 'axios'

// Separate bases because ESPN’s endpoints aren’t uniform
const SCHEDULE_BASE   = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga'
const LEADERBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard'

// Local cache (resets on process restart)
const cache = {
  eventId: null,
  leaderboard: null,
  lastFetch: 0,
}

const REFRESH_INTERVAL = 3 * 60 * 60 * 1000 // 3 h

/**
 * Choose the event we should track, prioritising:
 * 1. Event currently in progress (start ≤ now ≤ end)
 * 2. Most recently finished event
 * 3. Next upcoming event
 */
async function pickEventId () {
  const res = await axios.get(`${SCHEDULE_BASE}/schedule`)
  const events = res.data?.events ?? []
  if (!events.length) throw new Error('No PGA events returned by ESPN')

  // Map to uniform objects we can sort / filter
  const parsed = events
    .map(e => {
      const id = e.id || (e.uid?.split('~e:')[1] ?? null)
      const startDate = new Date(e.startDate || e.date || e.week?.startDate || e.week?.start || null)
      const endDate = new Date(e.endDate || e.week?.endDate || null)
      return id && !isNaN(startDate) ? { id, startDate, endDate } : null
    })
    .filter(Boolean)

  const now = new Date()

  // 1) active event
  const active = parsed.find(ev => ev.startDate <= now && now <= ev.endDate)
  if (active) return active.id

  // 2) most recent finished
  const past = parsed
    .filter(ev => ev.endDate < now)
    .sort((a, b) => b.endDate - a.endDate)
  if (past.length) return past[0].id

  // 3) next upcoming
  const upcoming = parsed
    .filter(ev => ev.startDate > now)
    .sort((a, b) => a.startDate - b.startDate)
  if (upcoming.length) return upcoming[0].id

  // Fallback
  return parsed[0].id
}

/**
 * Cached fetch of ESPN leaderboard for the chosen event.
 */
export async function getLeaderboard () {
  const now = Date.now()
  if (cache.leaderboard && now - cache.lastFetch < REFRESH_INTERVAL) {
    return cache.leaderboard
  }

  // Ensure we have a valid event ID
  if (!cache.eventId) cache.eventId = await pickEventId()

  // Helper to fetch leaderboard
  const fetchLb = async (withEvent = true) => {
    if (withEvent) {
      return axios.get(LEADERBOARD_URL, { params: { event: cache.eventId } })
    }
    return axios.get(LEADERBOARD_URL)
  }

  try {
    const lbRes = await fetchLb(true)
    cache.leaderboard = lbRes.data
    cache.lastFetch = now
  } catch (err) {
    if (err.response?.status === 404) {
      // Maybe the event param pattern isn’t supported; try without param
      const alt = await fetchLb(false)
      cache.leaderboard = alt.data
      cache.lastFetch = now
      // Update eventId so subsequent logic knows the actual event
      const events = alt.data.events ?? []
      cache.eventId = events[0]?.id ?? cache.eventId
    } else {
      throw err
    }
  }

  return cache.leaderboard
}

export function currentEventId () {
  return cache.eventId
}
