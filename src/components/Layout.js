// src/components/Layout.js
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Layout({ children }) {
  const router = useRouter()
  const { leagueId } = router.query
  const [league, setLeague] = useState(null)

  // on Next.js, `router.pathname` is the page template ("/draft")
  // but in case of a catch-all or different name, also guard by URL:
  const isDraftPage =
    router.pathname === '/draft' ||
    router.asPath.startsWith('/draft')

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
      .catch(() => {
        /* ignore errors so child pages always render */
      })
  }, [leagueId])

  // Only attach the course background if NOT on draft
  const wrapperStyle = !isDraftPage
    ? {
        backgroundImage: `url('/images/bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
      }
    : undefined

  return (
    <div className="min-h-screen" style={wrapperStyle}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {league && (
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-center text-green-600">
              {league.name}
            </h1>
          </header>
        )}
        {children}
      </div>
    </div>
  )
}
