/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/sistema',
  experimental: {
    serverComponentsExternalPackages: ['sql.js'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push('sql.js')
    }
    return config
  },
}

module.exports = nextConfig
