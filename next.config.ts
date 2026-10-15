import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Consolidate alternate public URLs under the one indexed canonical host.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "moimashinani\\.vercel\\.app" }],
        destination: "https://moimashinani.gtss.software/:path*",
        permanent: true,
      },
    ];
  },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async headers() {
    return [{ source: '/merchant/action/:token', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Cache-Control', value: 'private, no-store' }] }, {source:'/firebase-messaging-sw.js',headers:[{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'},{key:'Service-Worker-Allowed',value:'/'}]}, { source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ] }];
  },
};

export default nextConfig;
