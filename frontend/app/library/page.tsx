'use client';

import dynamic from 'next/dynamic';

const Library = dynamic(() => import('@/pages/Library'), {
  ssr: false,
});

export default function LibraryPage() {
  return <Library />;
}
