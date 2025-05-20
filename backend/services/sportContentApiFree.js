// backend/services/sportContentApiFree.js – fix ESPN leaderboard param (tournamentId)
import axios from 'axios'

const SCHED_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/schedule'
const LB_URL    = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard'

const REFRESH_INTERVAL = 3 * 60 * 60 * 1000 // 3 h

const cache = {
  tournamentId: null,
  leaderboard: null,
  lastFetch: 0,
}

/**
 * Pick a tournament ID using live/finished/upcoming priority.
 */
async function pickTournamentId () {
  const res = await axios.get(SCHED_URL)
  const events = res.data?.events ?? []
  if (!events.length) throw new Error('Empty ESPN schedule')

  const parsed = events
    .map(e => {
      const id = e.id || (e.uid?.split('~e:')[1] ?? null)
      const start = new Date(e.startDate || e.date)
      const end   = new Date(e.endDate   || start)
      return id && !isNaN(start) ? { id, start, end } : null
    })
    .filter(Boolean)

  const now = new Date()
  const active   = parsed.find(ev => ev.start <= now && now <= ev.end)
  if (active) return active.id

  const past = parsed.filter(ev => ev.end < now).sort((a,b)=>b.end-a.end)
  if (past.length) return past[0].id

  const upcoming = parsed.filter(ev => ev.start > now).sort((a,b)=>a.start-b.start)
  return upcoming.length ? upcoming[0].id : parsed[0].id
}

/**
 * Return cached leaderboard, refreshing from ESPN when stale.
 */
export async function getLeaderboard () {
  const now = Date.now()
  if (cache.leaderboard && now - cache.lastFetch < REFRESH_INTERVAL) {
    return cache.leaderboard
  }

  if (!cache.tournamentId) cache.tournamentId = await pickTournamentId()

  try {
    const lbRes = await axios.get(LB_URL, {
      params: { tournamentId: cache.tournamentId },
    })
    cache.leaderboard = lbRes.data
    cache.lastFetch = now
  } catch (err) {
    // If tournament has no dedicated leaderboard yet, fall back to default
    console.warn('ESPN leaderboard fetch failed, trying default:', err.message)
    const fallback = await axios.get(LB_URL)
    cache.leaderboard  = fallback.data
    cache.tournamentId = fallback.data?.events?.[0]?.id ?? null
    cache.lastFetch    = now
  }

  return cache.leaderboard
}

export function currentTournamentId () {
  return cache.tournamentId
}
