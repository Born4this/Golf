// src/pages/draft.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Draft() {
  const router = useRouter();
  const leagueId = router.query.leagueId;

  const [golfers, setGolfers] = useState([]);            // start as empty array
  const [loadingGolfers, setLoadingGolfers] = useState(true);
  const [golferError, setGolferError] = useState(null);

  // other state: picks, draftList, etc.

  // fetch the golfer pool once
  useEffect(() => {
    if (!leagueId) return;
    setLoadingGolfers(true);
    fetch('/api/golfers/current')
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        // data.field is array of { id, name }
        setGolfers(data.field || []);
        setGolferError(null);
      })
      .catch(err => {
        console.error('Failed to load golfers:', err);
        setGolferError('Could not load golfer list. Please try again later.');
      })
      .finally(() => setLoadingGolfers(false));
  }, [leagueId]);

  // memoize your filtered list so you’re not calling filter on undefined
  const filteredGolfers = useMemo(() => {
    return golfers.filter(g => {
      // your filter logic, e.g.
      return g.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [golfers, searchTerm]);

  // … your existing draft logic …

  if (loadingGolfers) {
    return (
      <Layout>
        <p className="text-center mt-8">Loading golfers…</p>
      </Layout>
    );
  }

  if (golferError) {
    return (
      <Layout>
        <p className="text-center mt-8 text-red-500">{golferError}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-8 bg-white shadow-lg rounded-lg overflow-hidden">
        {/* … header, invite link, etc … */}

        {/* Search */}
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search golfers…"
          className="w-full px-4 py-2 border rounded mb-4"
        />

        {/* Available Golfers */}
        <h2 className="font-semibold">Available Golfers</h2>
        {filteredGolfers.length === 0 ? (
          <p className="text-sm text-gray-500">No golfers match your search.</p>
        ) : (
          <ul className="divide-y">
            {filteredGolfers.map(g => (
              <li key={g.id} className="py-2 flex justify-between">
                <span>{g.name}</span>
                <button
                  onClick={() => pickGolfer(g.id)}
                  className="text-blue-600 hover:underline"
                >
                  Pick
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* … rest of draft UI … */}
      </div>
    </Layout>
  );
}
