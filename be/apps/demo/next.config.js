/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/pt', destination: '/pt.html' },
    ];
  },
};

module.exports = nextConfig;
