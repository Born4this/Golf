// src/components/Layout.js
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const router = useRouter();
  const { leagueId } = router.query;
  const [league, setLeague] = useState(null);

  /* Draft page: special background, no header */
  const isDraftPage =
    router.pathname === '/draft' || router.asPath.startsWith('/draft');

  /* Pages where we hide just the league-name header */
  const hideLeagueHeader =
    isDraftPage ||
    ['/team', '/leaderboard'].some(path =>
      router.pathname.startsWith(path) || router.asPath.startsWith(path)
    );

  /* Pages that need a bit of breathing-room above the card */
  const needsTopSpacing =
    ['/draft'].some(path =>
      router.pathname.startsWith(path) || router.asPath.startsWith(path)
    );

  /* Fetch league name only if we plan to show it */
  useEffect(() => {
    if (!leagueId || hideLeagueHeader) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`/api/leagues/${leagueId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setLeague(data.league))
      .catch(() => {});
  }, [leagueId, hideLeagueHeader]);

  /* Choose background image: draft gets its own */
  const bgImage = isDraftPage
    ? "url('/images/draftbg.png')"
    : "url('/images/bg.jpg')";

  return (
    <>
      {/* Background shown on every page; image changes for /draft */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: bgImage }}
      />

      <div className="relative min-h-screen z-10">
        {/* League name header hidden on /draft, /team, /leaderboard */}
        {!hideLeagueHeader && league && (
          <header className="max-w-5xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-center text-green-600">
              {league.name}
            </h1>
          </header>
        )}

        {/* Page content */}
        <main
          className={`max-w-5xl mx-auto px-4 pb-6${
            needsTopSpacing ? ' pt-4' : ''
          }`}
        >
          {children}
        </main>
      </div>
    </>
  );
}
