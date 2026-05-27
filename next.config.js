/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/sistema',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
}

module.exports = nextConfig
