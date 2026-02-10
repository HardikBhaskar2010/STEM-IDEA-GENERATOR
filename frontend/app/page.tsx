'use client';

import dynamic from 'next/dynamic';

const Welcome = dynamic(() => import('@/pages/Welcome'), {
  ssr: false,
});

export default function WelcomePage() {
  return <Welcome />;
}
