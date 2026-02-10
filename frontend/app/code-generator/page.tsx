'use client';

import dynamic from 'next/dynamic';

const CodeGenerator = dynamic(() => import('@/pages/CodeGenerator'), {
  ssr: false,
});

export default function CodeGeneratorPage() {
  return <CodeGenerator />;
}
