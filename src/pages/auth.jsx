// src/pages/auth.jsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const router = useRouter();
  const { redirect } = router.query;

  const toggleMode = () => {
    setError('');
    setIsLogin(!isLogin);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const url = `/api/auth/${isLogin ? 'login' : 'register'}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.msg || 'Something went wrong');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);

      let destination = '/league-selector';
      if (redirect) {
        try {
          destination = decodeURIComponent(redirect);
        } catch {
          destination = redirect;
        }
      }

      router.push(destination);
    } catch (err) {
      console.error(err);
      setError('Server error');
    }
  };

  return (
    <Layout>
      {/* Centered card */}
      <div className="max-w-md mx-auto mt-12 p-8 bg-white shadow-lg rounded-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-green-600">
          Fantasy Golf
        </h1>
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">
          {isLogin ? 'Login' : 'Sign Up'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
          >
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={toggleMode}
            className="font-medium text-green-600 hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>

      {/* Fixed badge at viewport bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 bg-black bg-opacity-60 text-white text-xs font-medium px-3 py-1 rounded-lg shadow-md">
        Developed by Michael Morris
      </div>
    </Layout>
  );
}
