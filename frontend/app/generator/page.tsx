'use client';

import dynamic from 'next/dynamic';

const Generator = dynamic(() => import('@/pages/Generator'), {
  ssr: false,
});

export default function GeneratorPage() {
  return <Generator />;
}
