import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (production listing images)
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Inmovilla/CRM image CDNs (external listing images)
      {
        protocol: 'https',
        hostname: '*.inmovilla.com',
      },
      // Development mock images (picsum.photos)
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
};

export default nextConfig;
