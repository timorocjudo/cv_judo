/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/og/profile/[slug]': ['./public/fonts/**'],
      '/api/og/result/[slug]/[resultId]': ['./public/fonts/**'],
    },
  },
};

export default nextConfig;
