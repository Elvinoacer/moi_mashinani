import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MoiMashinani — Moi University Campus Business Directory',
    short_name: 'MoiMashinani',
    description:
      'Hyper-local campus business and services directory for Moi University Main Campus (Kesses). Find food, hostels, bedsitters, phone repairs, kinyozi salons, and fundis.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8f2',
    theme_color: '#183e35',
    icons: [
      {
        src: '/brand/moimashinani-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/brand/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
