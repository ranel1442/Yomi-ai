import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Yomi-AI — לימוד יפנית ומנגה חכם (Japanese Immersion OS)',
    short_name: 'Yomi-AI',
    description:
      'פלטפורמה אישית ללימוד יפנית באמצעות מנגה, אנימה, דוג׳ו קאנה וקאנג׳י ומנוע זיכרון FSRS — AI Japanese Immersion Studio',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    dir: 'rtl',
    lang: 'he',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    categories: ['education', 'books', 'productivity'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/pwa-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
