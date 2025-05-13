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

  const token  = typeof window !== 'undefined' && localStorage.getItem('token');
  const userId = typeof window !== 'undefined' && localStorage.getItem('userId');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const leagueReady = leagueDetails?.members?.length >= leagueDetails?.teamCount;

  const userMap = useMemo(() => {
    return (leagueDetails?.members || []).reduce((map, u) => {
      const id = u._id?.toString() || u.toString();
      map[id] = u.username;
      return map;
    }, {});
  }, [leagueDetails]);

  const upcoming = useMemo(() => {
    if (!order.length || !leagueDetails) return [];
    return order.slice(picks.length, picks.length + leagueDetails.teamCount);
  }, [order, picks, leagueDetails]);

  const available = useMemo(() => {
    const picked = new Set(picks.map(p => p.golfer));
    return field.filter(g => !picked.has(g.id));
  }, [field, picks]);

  const filtered = useMemo(() => {
    if (!searchTerm) return available;
    return available.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [available, searchTerm]);

  const copyLink = () => {
    const inviteUrl = `${window.location.origin}/auth?redirect=${encodeURIComponent(`/draft?leagueId=${leagueId}`)}`;
    navigator.clipboard.writeText(inviteUrl)
      .then(() => alert('Invite link copied!'))
      .catch(() => alert('Copy failed'));
  };

  const fetchLeague = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/leagues/${leagueId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      setLeagueDetails(data.league);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchDraft = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/leagues/${leagueId}/draft-list`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      setPicks(data.picks);
      setOrder(data.draftOrder);
      setIsMyTurn(data.draftOrder[data.picks.length] === userId);
      if (data.draftOrder.length && !leagueDetails?.draftOrder?.length) fetchLeague();
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchField = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/golfers/current`);
      const data = await res.json();
      setField(data.field);
    } catch {}
  };

  useEffect(() => {
    if (!leagueId) return;
    fetchLeague(); fetchDraft(); fetchField();
    const iv = setInterval(fetchDraft, 10000);
    return () => clearInterval(iv);
  }, [leagueId]);

  useEffect(() => {
    if (
      leagueDetails?.members &&
      userId &&
      !joining &&
      !leagueDetails.members.some(m => (m._id||m).toString() === userId)
    ) {
      setJoining(true);
      fetch(`${apiUrl}/api/leagues/join`, { method: 'POST', headers, body: JSON.stringify({ leagueId }) })
        .then(r => r.json()).then(data => { if (data.league) { fetchLeague(); fetchDraft(); } })
        .finally(() => setJoining(false));
    }
  }, [leagueDetails]);

  const makePick = async (golferId, golferName) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/api/leagues/${leagueId}/picks`, { method: 'POST', headers, body: JSON.stringify({ golferId, golferName }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.msg);
      setPicks(data.picks); setOrder(data.draftOrder);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const isComplete = picks.length >= order.length;

  return (
    <Layout>
      {/* Hero: increased height and overlap */}
      <header className="flex flex-col items-center justify-center py-6 bg-gradient-to-r from-green-500 to-green-300 text-white">
        <h1 className="text-3xl font-bold">Draft Room</h1>
        <button
          onClick={copyLink}
          disabled={joining}
          className="mt-4 inline-flex items-center space-x-2 bg-white bg-opacity-90 hover:bg-opacity-100 px-4 py-2 rounded-full shadow transition"
        >
          <span className="text-green-600 font-semibold">📨 Invite</span>
          <span className="text-gray-700">Copy Link</span>
        </button>
      </header>

      <main className="px-4 md:px-8 pt-6 pb-12"> {/* lifted up */}
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}

        {!leagueReady && leagueDetails && (
          <div className="text-yellow-800 bg-yellow-100 py-2 px-4 rounded mb-4 text-center">
            Waiting for players: {leagueDetails.members.length}/{leagueDetails.teamCount}
          </div>
        )}

        {leagueReady && (
          <>  {/* upcoming + search */}
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-center">Upcoming Picks</h2>
              <ul className="flex overflow-x-auto space-x-3 py-2 px-2">
                {upcoming.map((uid, idx) => (
                  <li
                    key={idx}
                    className={`min-w-[5rem] text-center py-2 px-3 rounded-lg font-medium ${
                      idx === 0 ? 'bg-green-200' : 'bg-gray-100'
                    }`}
                  >
                    {userMap[uid] || uid}
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex justify-center mb-6">
              <input
                type="text"
                placeholder="Search golfers..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full max-w-md px-4 py-2 rounded-full
                           shadow-inner placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          </>
        )}

        {/* list + results + button unchanged colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {filtered.map(g => (
            <div key={g.id} className="flex justify-between items-center bg-white shadow rounded-lg py-3 px-4">
              <span className="font-medium text-gray-800">{g.name}</span>
              <button
                onClick={() => makePick(g.id, g.name)}
                disabled={!leagueReady || !isMyTurn || loading}
                className={`py-1 px-3 rounded-full text-sm font-semibold transition ${
                  leagueReady && isMyTurn
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >{loading ? '…' : 'Pick'}</button>
            </div>
          ))}
        </div>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Results</h2>
          <ul className="space-y-2">
            {picks.map((p, idx) => (
              <li key={idx} className="bg-white border-l-4 border-green-500 p-3 shadow-sm rounded">
                <div className="text-sm font-semibold">Round {p.round}, Pick {p.pickNo}</div>
                <div className="text-gray-700">{p.golferName} — by {userMap[p.user] || p.user}</div>
              </li>
            ))}
          </ul>
        </section>

        {leagueReady && (
          <button
            onClick={() => router.push(`/team?leagueId=${leagueId}`)}
            className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-full font-semibold transition"
          >View My Team</button>
        )}
      </main>
    </Layout>
  );
}
