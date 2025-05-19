/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // expose client API URL at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  async rewrites() {
    return [
      {
        // Proxy all /api/* calls to your backend
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`
      }
    ]
  }
}

module.exports = nextConfig
