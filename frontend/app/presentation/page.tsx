'use client';

import dynamic from 'next/dynamic';

const Presentation = dynamic(() => import('@/pages/Presentation'), {
  ssr: false,
});

export default function PresentationPage() {
  return <Presentation />;
}
