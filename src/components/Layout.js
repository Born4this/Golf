// src/components/Layout.js
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Layout({ children }) {
  const router = useRouter()
  const { leagueId } = router.query
  const [league, setLeague] = useState(null)

  // Detect draft page
  const isDraftPage =
    router.pathname === '/draft' || router.asPath.startsWith('/draft')

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
      {/* Full-screen background ONLY if not on draft */}
      {!isDraftPage && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/bg.jpg')",
          }}
        />
      )}

      {/* Main content wrapper */}
      <div className="relative min-h-screen z-10">
        <div className="max-w-5xl mx-auto px-4 py-6 bg-white rounded-lg shadow-lg">
          {league && (
            <header className="mb-6">
              <h1 className="text-3xl font-bold text-center text-green-600">
                {league.name}
              </h1>
            </header>
          )}
          {children}
        </div>
      </div>
    </>
  )
}
