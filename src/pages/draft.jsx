// src/pages/draft.jsx
import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

export default function Draft() {
  const router = useRouter()
  const { leagueId } = router.query

  const [field, setField] = useState([])
  const [picks, setPicks] = useState([])
  const [order, setOrder] = useState([])
  const [leagueDetails, setLeagueDetails] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)

  const token = typeof window !== 'undefined' && localStorage.getItem('token')
  const userId = typeof window !== 'undefined' && localStorage.getItem('userId')
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const leagueReady =
    leagueDetails?.members?.length >= leagueDetails?.teamCount

  const userMap = useMemo(() => {
    return (leagueDetails?.members || []).reduce((map, u) => {
      const id = u._id?.toString() || u.toString()
      map[id] = u.username
      return map
    }, {})
  }, [leagueDetails])

  const upcoming = useMemo(() => {
    if (!order.length || !leagueDetails) return []
    const start = picks.length
    const count = leagueDetails.teamCount
    return order.slice(start, start + count)
  }, [order, picks, leagueDetails])

  const available = useMemo(() => {
    const picked = new Set(picks.map(p => p.golfer))
    return field.filter(g => !picked.has(g.id))
  }, [field, picks])

  const filtered = useMemo(() => {
    if (!searchTerm) return available
    return available.filter(g =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [available, searchTerm])

  const copyLink = () => {
    const inviteUrl = `${window.location.origin}/auth?redirect=${encodeURIComponent(
      `/draft?leagueId=${leagueId}`
    )}`
    navigator.clipboard
      .writeText(inviteUrl)
      .then(() => alert('Invite link copied!'))
      .catch(() => alert('Copy failed'))
  }

  // Fetch league details
  const fetchLeague = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/leagues/${leagueId}`, {
        headers,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.msg || 'Failed to fetch league')
      setLeagueDetails(data.league)
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  // Fetch draft state
  const fetchDraft = async () => {
    try {
      const res = await fetch(
        `${apiUrl}/api/leagues/${leagueId}/draft-list`,
        { headers }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.msg || 'Failed to fetch draft')
      setPicks(data.picks)
      setOrder(data.draftOrder)
      const next = data.draftOrder[data.picks.length]
      setIsMyTurn(next === userId)
      if (data.draftOrder.length && !leagueDetails?.draftOrder?.length) {
        fetchLeague()
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  // Fetch full golfer field
  const fetchField = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/golfers/current`)
      const data = await res.json()
      setField(data.field)
    } catch (err) {
      console.error('Failed to fetch golfers', err)
    }
  }

  useEffect(() => {
    if (!leagueId) return
    fetchLeague()
    fetchDraft()
    fetchField()
    const iv = setInterval(fetchDraft, 10000)
    return () => clearInterval(iv)
  }, [leagueId])

  // Auto-join invited users
  useEffect(() => {
    if (
      leagueDetails?.members &&
      userId &&
      !joining &&
      !leagueDetails.members.some(
        m => (m._id || m).toString() === userId
      )
    ) {
      setJoining(true)
      fetch(`${apiUrl}/api/leagues/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ leagueId }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.league) {
            setLeagueDetails(data.league)
            fetchDraft()
          }
        })
        .finally(() => setJoining(false))
    }
  }, [leagueDetails])

  // Make a draft pick
  const makePick = async (golferId, golferName) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `${apiUrl}/api/leagues/${leagueId}/picks`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ golferId, golferName }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.msg || 'Failed to make pick')
      setPicks(data.picks)
      setOrder(data.draftOrder)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isComplete = picks.length >= order.length

  return (
    <Layout>
      {/* White card wrapper */}
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg mx-auto space-y-6">
        {/* League name */}
        {leagueDetails && (
          <h2 className="text-2xl font-bold text-center text-green-600">
            {leagueDetails.name}
          </h2>
        )}

        {/* Draft Room banner + invite */}
        <div className="flex flex-col items-center py-4 bg-gradient-to-r from-green-500 to-green-300 rounded-lg">
          <h1 className="text-2xl font-bold text-white mb-3">
            Draft Room
          </h1>
          <button
            onClick={copyLink}
            className="inline-flex items-center space-x-2 bg-white bg-opacity-90 px-5 py-2 rounded-full shadow hover:bg-opacity-100 transition"
          >
            <span className="text-green-600 font-semibold">
              📨 Invite
            </span>
            <span className="text-gray-700">
              {joining ? 'Joining…' : 'Copy Link'}
            </span>
          </button>
        </div>

        {/* Upcoming Picks */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-center">
            Upcoming Picks
          </h3>
          <ul className="flex space-x-3 overflow-x-auto">
            {upcoming.map((uid, idx) => (
              <li
                key={idx}
                className={`min-w-[6rem] py-2 px-3 text-center rounded-lg ${
                  idx === 0 ? 'bg-green-200' : 'bg-gray-100'
                }`}
              >
                {userMap[uid] || uid}
              </li>
            ))}
          </ul>
        </div>

        {/* Status message */}
        {!leagueReady && leagueDetails ? (
          <div className="text-yellow-800 bg-yellow-100 py-2 px-4 rounded text-center">
            Waiting for players: {leagueDetails.members.length}/
            {leagueDetails.teamCount}
          </div>
        ) : leagueReady ? (
          <div
            className={`text-center py-2 px-4 rounded ${
              isComplete
                ? 'bg-blue-100 text-blue-700'
                : isMyTurn
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {isComplete
              ? '✅ Draft complete!'
              : isMyTurn
              ? '🎯 It’s your turn!'
              : '⏳ Waiting for others...'}
          </div>
        ) : null}

        {/* Search bar (always visible) */}
        <div>
          <input
            type="text"
            placeholder="Search golfers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-full border-2 border-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {/* Available Golfers */}
        <div>
          <h3 className="text-xl font-semibold mb-2">
            Available Golfers
          </h3>
          <ul className="space-y-4">
            {filtered.map(g => (
              <li
                key={g.id}
                className="flex justify-between items-center bg-gray-50 rounded-xl px-5 py-3 shadow"
              >
                <span className="font-medium text-gray-800">
                  {g.name}
                </span>
                <button
                  onClick={() => makePick(g.id, g.name)}
                  disabled={!leagueReady || !isMyTurn || loading}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    leagueReady && isMyTurn
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Picking…' : 'Pick'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Your Picks */}
        <div>
          <h3 className="text-xl font-semibold mb-2">Your Picks</h3>
          <ul className="space-y-3">
            {picks.map((p, idx) => (
              <li
                key={idx}
                className="bg-white border-l-4 border-purple-500 p-4 rounded-lg shadow-sm"
              >
                <div className="text-sm font-semibold mb-1">
                  Round {p.round}, Pick {p.pickNo}
                </div>
                <div className="text-gray-700">
                  {p.golferName} — by {userMap[p.user] || p.user}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* View My Team */}
        {leagueReady && (
          <button
            onClick={() =>
              router.push(`/team?leagueId=${leagueId}`)
            }
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-lg font-semibold transition"
          >
            View My Team
          </button>
        )}
      </div>
    </Layout>
  )
}
