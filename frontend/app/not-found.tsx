'use client';

import dynamic from 'next/dynamic';

const NotFound = dynamic(() => import('@/pages/NotFound'), {
  ssr: false,
});

export default function NotFoundPage() {
  return <NotFound />;
}
