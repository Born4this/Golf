// src/components/Layout.js
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Layout({ children }) {
  const router = useRouter()
  const { leagueId } = router.query
  const [league, setLeague] = useState(null)

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
      .then(res => {
        if (!res.ok) throw new Error('Couldn’t load league')
        return res.json()
      })
      .then(data => setLeague(data.league))
      .catch(err => console.error('League fetch error:', err))
  }, [leagueId])

  return (
    <div className="min-h-screen bg-blue-50">
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
