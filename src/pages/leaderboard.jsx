// src/pages/leaderboard.jsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import Layout from '../components/Layout';

export default function Leaderboard() {
  const router = useRouter();
  const { leagueId } = router.query;

  const [standings, setStandings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [openUser, setOpenUser] = useState(null);

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Refresh scores and leaderboard, cut logic
  const refreshLeaderboard = async () => {
    if (!leagueId) return;
    setLoading(true);
    setError('');
    try {
      // 1) Refresh scores (upsert strokes with cap logic)
      const resScores = await fetch(`/api/scores/${leagueId}`, { headers });
      if (!resScores.ok) throw new Error('Failed to refresh scores');

      // 2) Update standings
      const resBoard = await fetch(
        `/api/leagues/${leagueId}/leaderboard`,
        { headers }
      );
      if (!resBoard.ok) {
        const data = await resBoard.json();
        throw new Error(data.msg || 'Failed to load leaderboard');
      }
      const { standings: sb } = await resBoard.json();
      setStandings(sb);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!leagueId) return;
    // Initial load
    refreshLeaderboard();
    // Refresh every 2 min
    const intervalId = setInterval(refreshLeaderboard, 2 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [leagueId]);

  const toggle = (uid) => setOpenUser(openUser === uid ? null : uid);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto mt-8 bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-green-800">
          <h1 className="text-white text-2xl font-semibold text-center">
            My League
          </h1>
          <p className="text-green-300 text-center mt-1">Leaderboard</p>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && <p className="text-center">Loading…</p>}
          {error && (
            <p className="text-red-500 text-center">Error: {error}</p>
          )}

          {!loading && !error && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {standings.map((s, i) => (
                  <React.Fragment key={s.userId}>
                    {/* main row */}
                    <tr
                      onClick={() => toggle(s.userId)}
                      className="cursor-pointer hover:bg-gray-100 transition-colors duration-150"
                    >
                      <td className="px-4 py-3">{i + 1}</td>
                      <td className="px-4 py-3 flex items-center justify-between">
                        <span>{s.username}</span>
                        {openUser === s.userId ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {s.totalStrokes}
                      </td>
                    </tr>

                    {/* expanded picks */}
                    {openUser === s.userId && (
                      <tr>
                        <td colSpan={3} className="bg-gray-50 px-4 py-3">
                          <ul className="divide-y divide-gray-200">
                            {s.picks.map((p) => (
                              <li
                                key={p.golferId}
                                className="flex justify-between py-2"
                              >
                                <span>{p.name}</span>
                                <span className="font-mono">{p.strokes}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {/* Back button */}
          <button
            onClick={() => router.push(`/team?leagueId=${leagueId}`)}
            className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition-colors"
          >
            Back to My Team
          </button>
        </div>
      </div>
    </Layout>
  );
}
