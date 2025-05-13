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

  // Fetch full field
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

  // Auto-join invitees
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

  // Make a pick
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
      <h1 className="text-3xl font-bold text-center text-purple-700 mb-2">
        ⛳ Draft Room
      </h1>

      <div className="flex justify-center mb-4">
        {/* always enabled immediately */}
        <button
          onClick={copyLink}
          className="bg-gray-200 px-3 py-1 rounded"
        >
          📨 Invite
        </button>
      </div>

      {error && (
        <div className="text-red-500 text-center mb-4">{error}</div>
      )}

      {!leagueReady && leagueDetails && (
        <div className="text-yellow-800 bg-yellow-100 py-2 px-4 rounded mb-4 text-center">
          Waiting for players:{' '}
          {leagueDetails.members.length}/
          {leagueDetails.teamCount}
        </div>
      )}

      {/* show search as soon as league details exist */}
      {leagueDetails && (
        <div className="mb-4 text-center">
          <input
            type="text"
            placeholder="Search golfers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      )}

      {leagueReady && (
        <>
          <h2 className="text-xl font-semibold text-center mb-2">
            Upcoming Picks
          </h2>
          <ol className="list-decimal list-inside grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {upcoming.map((uid, idx) => (
              <li
                key={idx}
                className={`p-2 rounded text-sm text-center ${
                  idx === 0 ? 'bg-green-200' : 'bg-gray-100'
                }`}
              >
                {userMap[uid] || uid}
              </li>
            ))}
          </ol>

          <div
            className={`text-center py-2 px-4 mb-6 rounded ${
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
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Available Golfers
          </h2>
          <ul className="space-y-3">
            {filtered.map(g => (
              <li
                key={g.id}
                className="flex justify-between items-center bg-white border rounded-lg px-4 py-2 shadow"
              >
                <span className="font-medium">{g.name}</span>
                <button
                  onClick={() => makePick(g.id, g.name)}
                  disabled={
                    !leagueReady || !isMyTurn || loading
                  }
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
                    leagueReady && isMyTurn
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Picking…' : 'Pick'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">
            Your Picks
          </h2>
          <ul className="space-y-2">
            {picks.map((p, idx) => (
              <li
                key={idx}
                className="bg-white border-l-4 border-purple-500 p-3 shadow-sm rounded"
              >
                <div className="text-sm font-semibold">
                  Round {p.round}, Pick {p.pickNo}
                </div>
                <div className="text-gray-700">
                  {p.golferName} — by{' '}
                  {userMap[p.user] || p.user}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {leagueReady && (
        <button
          onClick={() =>
            router.push(`/team?leagueId=${leagueId}`)
          }
          className="mt-8 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-lg transition"
        >
          View My Team
        </button>
      )}
    </Layout>
  )
}
