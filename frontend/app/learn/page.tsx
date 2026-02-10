'use client';

import dynamic from 'next/dynamic';

const Learn = dynamic(() => import('@/pages/Learn'), {
  ssr: false,
});

export default function LearnPage() {
  return <Learn />;
}
