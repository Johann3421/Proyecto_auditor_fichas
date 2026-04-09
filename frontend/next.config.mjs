/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        // Proxies to the internal docker network URL (e.g. http://ceam-backend:8080)
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://backend:8080'}/api/v1/:path*`,
      },
    ]
  }
};

export default nextConfig;
