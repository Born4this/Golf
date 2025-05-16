// src/components/Layout.js
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Layout({ children }) {
  const router = useRouter()
  const { leagueId } = router.query
  const [league, setLeague] = useState(null)

  // Detect draft page for no bg
  const isDraftPage =
    router.pathname === '/draft' || router.asPath.startsWith('/draft')

  // Load league name for header
  useEffect(() => {
    if (!leagueId) return
    const token = localStorage.getItem('token')
    if (!token) return

    fetch(`/api/leagues/${leagueId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setLeague(data.league))
      .catch(() => {})
  }, [leagueId])

  return (
    <>
      {/* brackground not draft page */}
      {!isDraftPage && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/bg.jpg')" }}
        />
      )}

      <div className="relative min-h-screen z-10">
        {/* p */}
        {league && (
          <header className="max-w-5xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-center text-green-600">
              {league.name}
            </h1>
          </header>
        )}

        {/* page */}
        <main className="max-w-5xl mx-auto px-4 pb-6">
          {children}
        </main>
      </div>
    </>
  )
}
