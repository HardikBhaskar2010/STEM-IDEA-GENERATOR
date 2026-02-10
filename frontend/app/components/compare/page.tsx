'use client';

import dynamic from 'next/dynamic';

const ComponentComparison = dynamic(() => import('@/pages/ComponentComparison'), {
  ssr: false,
});

export default function ComponentComparisonPage() {
  return <ComponentComparison />;
}
