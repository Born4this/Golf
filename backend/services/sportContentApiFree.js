// backend/services/sportContentApiFree.js – simplified ESPN fetch (no params)
import axios from 'axios'

const LB_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 3 hours

const cache = {
  data: null,
  fetchedAt: 0,
  tournamentId: null,
}

/**
 * Returns ESPN leaderboard JSON. We simply hit the generic leaderboard
 * endpoint (which always returns the most recent / current event) once,
 * then serve the result from memory for the next 3 h to keep traffic low.
 */
export async function getLeaderboard () {
  const now = Date.now()
  if (cache.data && now - cache.fetchedAt < CACHE_TTL) {
    return cache.data
  }

  const res = await axios.get(LB_URL)
  if (!res.data?.events?.length) {
    throw new Error('ESPN: no events in leaderboard response')
  }

  cache.data        = res.data
  cache.fetchedAt   = now
  cache.tournamentId = res.data.events[0].id
  return cache.data
}

export function currentTournamentId () {
  return cache.tournamentId
}