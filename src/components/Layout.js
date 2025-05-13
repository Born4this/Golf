// src/components/Layout.js
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Layout({ children }) {
  const router = useRouter()
  const { leagueId } = router.query
  const [league, setLeague] = useState(null)

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

  const wrapperStyle = !isDraftPage
    ? {
        backgroundImage: `url('/images/bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }
    : {}

  return (
    <div className="min-h-screen w-full" style={wrapperStyle}>
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
