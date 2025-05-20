// src/components/Layout.js
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const router = useRouter();
  const { leagueId } = router.query;
  const [league, setLeague] = useState(null);

  /* Draft page: hide BOTH background and header */
  const isDraftPage =
    router.pathname === '/draft' || router.asPath.startsWith('/draft');

  /* Pages where only the header (league name) should be hidden */
  const hideLeagueHeader =
    isDraftPage ||
    ['/team', '/leaderboard'].some(path =>
      router.pathname.startsWith(path) || router.asPath.startsWith(path)
    );

  /* Load league name only when we plan to show it */
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

  return (
    <>
      {/* Background everywhere except the draft page */}
      {!isDraftPage && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/bg.jpg')" }}
        />
      )}

      <div className="relative min-h-screen z-10">
        {/* League name header excluded on /draft, /team, /leaderboard */}
        {!hideLeagueHeader && league && (
          <header className="max-w-5xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-center text-green-600">
              {league.name}
            </h1>
          </header>
        )}

        {/* Page content */}
        <main className="max-w-5xl mx-auto px-4 pb-6">{children}</main>
      </div>
    </>
  );
}
