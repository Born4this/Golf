// src/pages/draft.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Draft() {
  const router = useRouter();
  const { leagueId } = router.query;

  const [field, setField] = useState([]);
  const [picks, setPicks] = useState([]);
  const [order, setOrder] = useState([]);
  const [leagueDetails, setLeagueDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  const token = typeof window !== 'undefined' && localStorage.getItem('token');
  const userId = typeof window !== 'undefined' && localStorage.getItem('userId');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const leagueReady = leagueDetails?.members?.length >= leagueDetails?.teamCount;

  // Map user IDs to usernames
  const userMap = useMemo(() => {
    return (leagueDetails?.members || []).reduce((map, u) => {
      const id = u._id?.toString() || u.toString();
      map[id] = u.username;
      return map;
    }, {});
  }, [leagueDetails]);

  // Next picks window
  const upcoming = useMemo(() => {
    if (!order.length || !leagueDetails) return [];
    const start = picks.length;
    const count = leagueDetails.teamCount;
    return order.slice(start, start + count);
  }, [order, picks, leagueDetails]);

  // Available golfers
  const available = useMemo(() => {
    const picked = new Set(picks.map(p => p.golfer));
    return field.filter(g => !picked.has(g.id));
  }, [field, picks]);

  // Search filter
  const filtered = useMemo(() => {
    if (!searchTerm) return available;
    return available.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [available, searchTerm]);

  // Copy invite link
  const copyLink = () => {
    const inviteUrl = `${window.location.origin}/auth?redirect=${encodeURIComponent(`/draft?leagueId=${leagueId}`)}`;
    navigator.clipboard.writeText(inviteUrl)
      .then(() => alert('Invite link copied!'))
      .catch(() => alert('Failed to copy link'));
  };

  // Data fetchers
  const fetchLeague = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/leagues/${leagueId}`, { headers });
      const data = await res.json(); if (!res.ok) throw new Error(data.msg);
      setLeagueDetails(data.league);
    } catch (err) { setError(err.message); }
  };

  const fetchDraft = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/leagues/${leagueId}/draft-list`, { headers });
      const data = await res.json(); if (!res.ok) throw new Error(data.msg);
      setPicks(data.picks);
      setOrder(data.draftOrder);
      const next = data.draftOrder[data.picks.length];
      setIsMyTurn(next === userId);
      if (data.draftOrder.length && !leagueDetails?.draftOrder?.length) fetchLeague();
    } catch (err) { setError(err.message); }
  };

  const fetchField = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/golfers/current`);
      const data = await res.json();
      setField(data.field);
    } catch {}
  };

  // Auto-join if coming via invite
  useEffect(() => {
    const { redirect } = router.query;
    if (
      leagueDetails?.members &&
      userId &&
      !joining &&
      redirect &&
      !leagueDetails.members.some(m => (m._id || m).toString() === userId)
    ) {
      setJoining(true);
      fetch(`${apiUrl}/api/leagues/join`, {
        method: 'POST', headers, body: JSON.stringify({ leagueId })
      })
        .then(r => r.json())
        .then(data => {
          if (data.league) {
            fetchLeague(); fetchDraft();
          }
        })
        .finally(() => setJoining(false));
    }
  }, [leagueDetails, router.query]);

  // Make a pick
  const makePick = async (golferId, golferName) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/api/leagues/${leagueId}/picks`, {
        method:'POST', headers, body: JSON.stringify({ golferId, golferName })
      });
      const data = await res.json(); if (!res.ok) throw new Error(data.msg);
      setPicks(data.picks); setOrder(data.draftOrder);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const isComplete = picks.length >= order.length;

  // Initial data load
  useEffect(() => {
    if (!leagueId) return;
    fetchLeague(); fetchDraft(); fetchField();
    const iv = setInterval(fetchDraft, 10000);
    return () => clearInterval(iv);
  }, [leagueId]);

  return (
    <Layout>
      <header className="flex flex-col items-center py-4 bg-gradient-to-r from-purple-500 to-indigo-500">
        <h1 className="text-3xl font-bold text-white">Draft Room</h1>
        <button
          onClick={copyLink}
          disabled={joining}
          className="mt-3 flex items-center space-x-2 bg-white/90 hover:bg-white px-4 py-2 rounded-full shadow-md transition"
        >
          <span className="text-purple-600 font-semibold">📨 Invite</span>
          <span className="text-gray-600 text-sm">Copy Link</span>
        </button>
      </header>

      <main className="px-4 md:px-8 lg:px-16 py-6">
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        {!leagueReady && leagueDetails && (
          <div className="text-center bg-yellow-100 text-yellow-800 py-2 px-4 rounded-md mb-4">
            Waiting for players: {leagueDetails.members.length}/{leagueDetails.teamCount}
          </div>
        )}

        {leagueReady && (
          <>
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Upcoming Picks</h2>
              <ul className="flex overflow-x-auto space-x-3 py-2">
                {upcoming.map((uid, idx) => (
                  <li
                    key={idx}
                    className={`min-w-[6rem] text-center py-2 px-3 rounded-lg font-medium ${
                      idx === 0 ? 'bg-green-200' : 'bg-gray-100'
                    }`}
                  >
                    {userMap[uid] || uid}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-6 flex justify-center">
              <input
                type="text"
                placeholder="Search golfers"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full max-w-md px-4 py-3 rounded-full shadow-inner placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(g => (
                <div
                  key={g.id}
                  className="flex justify-between items-center bg-white shadow rounded-lg py-3 px-4"
                >
                  <span className="font-medium text-gray-800">{g.name}</span>
                  <button
                    onClick={() => makePick(g.id, g.name)}
                    disabled={!leagueReady || !isMyTurn || loading}
                    className={`py-1 px-3 rounded-full text-sm font-semibold transition ${
                      leagueReady && isMyTurn
                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {loading ? '…' : 'Pick'}
                  </button>
                </div>
              ))}
            </div>

            {/* Your Picks Section */}
            <section className="mt-8">
              <h2 className="text-xl font-semibold mb-2">Your Picks</h2>
              <ul className="space-y-2">
                {picks.map((p, idx) => (
                  <li
                    key={idx}
                    className="bg-white border-l-4 border-indigo-500 p-3 shadow-sm rounded"
                  >
                    <div className="text-sm font-semibold">
                      Round {p.round}, Pick {p.pickNo}
                    </div>
                    <div className="text-gray-700">
                      {p.golferName} — by {userMap[p.user] || p.user}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <button
              onClick={() => router.push(`/team?leagueId=${leagueId}`)}
              className="mt-8 w-full max-w-xs mx-auto block bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-full font-semibold transition"
            >
              View My Team
            </button>
          </>
        )}
      </main>
    </Layout>
  );
}
