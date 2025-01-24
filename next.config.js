/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // We'll handle ESLint separately
  },
  typescript: {
    ignoreBuildErrors: true, // We'll handle TypeScript errors separately
  },
  output: 'standalone', // Optimized for AWS deployment
  images: {
    domains: ['localhost'], // Add any external image domains you're using
    unoptimized: true, // Required for static exports
  },
  experimental: {
    serverActions: true,
  },
}

export default nextConfig 