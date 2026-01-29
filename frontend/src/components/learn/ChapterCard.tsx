import React from 'react';
import { ContentBlock } from '@/lib/learnParser';
import CodeBlock from './CodeBlock';
import NoteCard from './NoteCard';

interface ChapterCardProps {
  block: ContentBlock;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ block }) => {
  switch (block.type) {
    case 'heading':
      const HeadingTag = `h${block.level || 3}` as keyof JSX.IntrinsicElements;
      return (
        <HeadingTag className={`
          font-bold text-foreground
          ${block.level === 3 ? 'text-lg md:text-xl lg:text-2xl mt-4 md:mt-6 mb-2 md:mb-3' : 'text-base md:text-lg lg:text-xl mt-3 md:mt-4 mb-1.5 md:mb-2'}
        `}>
          {block.content}
        </HeadingTag>
      );

    case 'text':
      return (
        <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
          {block.content}
        </p>
      );

    case 'code':
      return <CodeBlock code={block.content} language={block.language} />;

    case 'list':
      const items = block.content.split('\n').map(item => item.replace(/^[\-\*] /, ''));
      return (
        <ul className="space-y-1.5 md:space-y-2 ml-3 md:ml-4">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2 md:gap-3">
              <span className="text-primary mt-1 md:mt-1.5 text-xs md:text-sm">▸</span>
              <span className="text-sm md:text-base text-foreground/90 flex-1">{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'note':
      return <NoteCard content={block.content} />;

    case 'separator':
      return <div className="border-t border-border my-4 md:my-6 lg:my-8" />;

    default:
      return null;
  }
};

export default ChapterCard;