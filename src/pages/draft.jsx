// src/pages/draft.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Draft() {
  const router = useRouter();
  const { leagueId } = router.query;

  /* ----------------------------- state ----------------------------- */
  const [field,         setField]         = useState([]);
  const [loadingField,  setLoadingField]  = useState(true);
  const [fieldError,    setFieldError]    = useState('');

  const [picks,         setPicks]         = useState([]);
  const [order,         setOrder]         = useState([]);
  const [leagueDetails, setLeagueDetails] = useState(null);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [isMyTurn,      setIsMyTurn]      = useState(false);
  const [joining,       setJoining]       = useState(false);
  const [loadingPick,   setLoadingPick]   = useState(false);
  const [error,         setError]         = useState('');

  const pollRef = useRef(null);

  const token   = typeof window !== 'undefined' && localStorage.getItem('token');
  const userId  = typeof window !== 'undefined' && localStorage.getItem('userId');
  const apiUrl  = process.env.NEXT_PUBLIC_API_URL;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const leagueReady = leagueDetails?.members?.length >= leagueDetails?.teamCount;
  const isComplete  = picks.length >= (order.length || 0);

  /* ------------------------- derived helpers ----------------------- */
  const userMap = useMemo(
    () =>
      (leagueDetails?.members || []).reduce((map, u) => {
        map[(u._id || u).toString()] = u.username || u;
        return map;
      }, {}),
    [leagueDetails]
  );

  const upcoming = useMemo(() => {
    if (!order.length) return [];
    const start = picks.length;
    const cnt   = leagueDetails?.teamCount || 0;
    return order.slice(start, start + cnt);
  }, [order, picks, leagueDetails]);

  const available = useMemo(() => {
    const picked = new Set(picks.map(p => p.golfer));
    return field.filter(g => !picked.has(g.id));
  }, [field, picks]);

  const filtered = useMemo(
    () =>
      searchTerm
        ? available.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : available,
    [available, searchTerm]
  );

  /* --------------------------- actions ----------------------------- */
  const copyLink = () => {
    const url = `${window.location.origin}/auth?redirect=${encodeURIComponent(
      `/draft?leagueId=${leagueId}`
    )}`;
    navigator.clipboard.writeText(url);
  };

  const fetchLeague = async () => {
    try {
      const res  = await fetch(`${apiUrl}/api/leagues/${leagueId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Fetch league failed');
      setLeagueDetails(data.league);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchDraft = async () => {
    try {
      const res  = await fetch(`${apiUrl}/api/leagues/${leagueId}/draft-list`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Fetch draft failed');
      setPicks(data.picks);
      setOrder(data.draftOrder);
      setIsMyTurn(data.draftOrder[data.picks.length] === userId);
      if (data.draftOrder.length && !leagueDetails?.draftOrder?.length) fetchLeague();
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchField = async () => {
    setLoadingField(true);
    try {
      const res  = await fetch(`${apiUrl}/api/golfers/current`);
      const data = await res.json();
      if (!res.ok) throw new Error('Could not load golfer list.');
      setField(data.field || []);
    } catch (err) {
      setFieldError(err.message);
    } finally {
      setLoadingField(false);
    }
  };

  const makePick = async (golferId, golferName) => {
    setLoadingPick(true);
    try {
      const res  = await fetch(
        `${apiUrl}/api/leagues/${leagueId}/picks`,
        { method: 'POST', headers, body: JSON.stringify({ golferId, golferName }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Pick failed');
      setPicks(data.picks);
      setOrder(data.draftOrder);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPick(false);
    }
  };

  /* --------------------------- effects ----------------------------- */
  useEffect(() => {
    if (!leagueId) return;

    fetchLeague();
    fetchDraft();
    fetchField();

    /* poll control + Page Visibility */
    const startPolling = () => {
      if (!pollRef.current) pollRef.current = setInterval(fetchDraft, 10_000);
    };
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    const visHandler = () => (document.hidden ? stopPolling() : startPolling());

    startPolling();
    document.addEventListener('visibilitychange', visHandler);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', visHandler);
    };
  }, [leagueId]);

  /* auto-join via invite link */
  useEffect(() => {
    if (
      leagueDetails?.members &&
      userId &&
      !joining &&
      !leagueDetails.members.some(m => (m._id || m).toString() === userId)
    ) {
      setJoining(true);
      fetch(`${apiUrl}/api/leagues/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ leagueId }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.league) {
            setLeagueDetails(d.league);
            fetchDraft();
          }
        })
        .finally(() => setJoining(false));
    }
  }, [leagueDetails, leagueId, joining, userId]);

  /* ----------------------- loading guards -------------------------- */
  if (loadingField)
    return (
      <Layout>
        <p className="text-center mt-8">Loading golfers…</p>
      </Layout>
    );
  if (fieldError)
    return (
      <Layout>
        <p className="text-center mt-8 text-red-500">{fieldError}</p>
      </Layout>
    );

  /* --------------------------- render ------------------------------ */
  return (
    <Layout>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-lg mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col items-center py-3 bg-gradient-to-r from-green-500 to-green-300 rounded-lg">
          <h1 className="text-2xl font-bold text-white mb-3">Draft Room</h1>

          {/* single button slot */}
          {!isComplete ? (
            <button
              onClick={copyLink}
              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-semibold text-xs transition"
            >
              {joining ? 'Joining…' : 'Copy Invite Link'}
            </button>
          ) : (
            <button
              onClick={() => router.push(`/team?leagueId=${leagueId}`)}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-semibold text-sm transition"
            >
              View My Team
            </button>
          )}
        </div>

        {/* RESULTS slider */}
        <div>
          <h2 className="text-med font-semibold mb-2">Results</h2>
          {picks.length === 0 ? (
            <p className="text-gray-500 text-center">No picks yet.</p>
          ) : (
            <ul className="flex space-x-3 overflow-x-auto px-1">
              {picks
                .slice()
                .reverse()
                .map((p, idx) => (
                  <li
                    key={idx}
                    className="min-w-[10rem] bg-gray-50 rounded-lg p-3 shadow text-center"
                  >
                    <span className="block text-sm font-medium mb-1">
                      {p.golferName}
                    </span>
                    <span className="text-xs text-gray-600">
                      Pick {p.pickNo} • {userMap[p.user] || p.user}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* UPCOMING picks slider */}
        <div>
          <h2 className="text-med font-semibold mb-2">
            Upcoming Picks
          </h2>
          <ul className="flex space-x-3 overflow-x-auto px-1">
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

        {/* AVAILABLE golfers */}
        <div>
          <h2 className="text-med font-semibold mb-2">Available Golfers</h2>

          {/* SEARCH (now slimmer & positioned under the heading) */}
          <input
            type="text"
            placeholder="Search golfers…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full mb-4 px-3 py-1 rounded-full border-2 border-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400"
          />

          {filtered.length === 0 ? (
            <p className="text-gray-500">No golfers match your search.</p>
          ) : (
            <ul className="space-y-4">
              {filtered.map(g => (
                <li
                  key={g.id}
                  className="flex justify-between items-center bg-gray-50 rounded-xl px-5 py-3 shadow"
                >
                  <span className="font-medium text-gray-800">{g.name}</span>
                  <button
                    onClick={() => makePick(g.id, g.name)}
                    disabled={
                      !leagueReady || order[picks.length] !== userId || loadingPick
                    }
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                      leagueReady && order[picks.length] === userId
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {loadingPick ? 'Picking…' : 'Pick'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
