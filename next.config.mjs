import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 🚀 PERFORMANCE FIX: Allow external image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.doitinparis.com' },
    ],
  },
  // 🛡️ SECURITY HEADERS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // ✅ FIX: Changed camera=() to camera=(self) to allow scanner access
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' }
        ],
      },
    ]
  },
};

export default withNextIntl(nextConfig);