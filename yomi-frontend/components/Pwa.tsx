'use client';

import { useEffect } from 'react';

export default function Pwa() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker Registered!', reg))
        .catch((err) => console.error('Service Worker Failed to Register', err));
    }
  }, []);

  return null;
}