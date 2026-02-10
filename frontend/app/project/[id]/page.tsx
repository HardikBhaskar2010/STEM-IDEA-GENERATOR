'use client';

import dynamic from 'next/dynamic';

const ProjectDetail = dynamic(() => import('@/pages/ProjectDetail'), {
  ssr: false,
});

export default function ProjectDetailPage() {
  return <ProjectDetail />;
}
