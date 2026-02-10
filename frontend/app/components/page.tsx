'use client';

import dynamic from 'next/dynamic';

const Components = dynamic(() => import('@/pages/Components'), {
  ssr: false,
});

export default function ComponentsPage() {
  return <Components />;
}
