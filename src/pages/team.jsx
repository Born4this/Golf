// src/pages/team.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Team() {
  const router = useRouter();
  const { leagueId } = router.query;
  const [user, setUser]           = useState('');
  const [team, setTeam]           = useState([]);
  const [error, setError]         = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  const token = typeof window !== 'undefined' && localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // fetch the user's team
  const fetchTeam = async () => {
    if (!leagueId) return;
    try {
      const res  = await fetch(`/api/leagues/${leagueId}/team`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Error fetching team');
      setUser(data.user);
      setTeam(data.team);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  // sync scores then reload team
  const refreshScores = async () => {
    if (!leagueId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/scores/${leagueId}`, { headers });
      if (!res.ok) throw new Error('Failed to refresh scores');
      await fetchTeam();
    } catch (err) {
      console.error('Error syncing scores:', err);
      setError(err.message || 'Failed to refresh scores');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!leagueId) return;

    // start polling every 2 minutes
    const startPolling = () => {
      if (pollRef.current == null) {
        // initial load
        refreshScores();
        pollRef.current = setInterval(refreshScores, 2 * 60 * 1000);
      }
    };

    const stopPolling = () => {
      if (pollRef.current != null) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // kick off polling when component mounts
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [leagueId]);

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-8 bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-green-600">
          <h2 className="text-white text-2xl font-semibold text-center">
            {user ? `${user}'s Team` : 'Your Team'}
          </h2>
        </div>

        {/* Body */}
        <div className="px-4 py-6">
          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

          <button
            onClick={refreshScores}
            disabled={refreshing}
            className="mb-6 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-md transition disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh Scores'}
          </button>

          {/* Team List */}
          <ul className="flex flex-col gap-4">
            {team.map((p, idx) => (
              <li
                key={idx}
                className="w-full bg-gray-50 p-4 rounded-lg shadow-inner flex justify-between items-center"
              >
                <span className="font-semibold text-lg">{p.golferName}</span>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Pick #{p.pickNo}</span>
                  <span
                    className={`font-semibold ${
                      p.strokes > 0
                        ? 'text-red-600'
                        : p.strokes < 0
                        ? 'text-green-600'
                        : ''
                    }`}
                  >
                    {p.strokes != null
                      ? (p.strokes > 0 ? `+${p.strokes}` : p.strokes)
                      : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={() => router.push(`/leaderboard?leagueId=${leagueId}`)}
            className="mt-8 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    </Layout>
  );
}
