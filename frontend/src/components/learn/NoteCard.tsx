import React from 'react';
import { Lightbulb, AlertCircle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface NoteCardProps {
  content: string;
  type?: 'tip' | 'warning' | 'info';
}

const NoteCard: React.FC<NoteCardProps> = ({ content, type = 'info' }) => {
  const config = {
    tip: {
      icon: Lightbulb,
      className: 'bg-yellow-500/10 border-yellow-500/30',
      iconColor: 'text-yellow-500'
    },
    warning: {
      icon: AlertCircle,
      className: 'bg-red-500/10 border-red-500/30',
      iconColor: 'text-red-500'
    },
    info: {
      icon: Info,
      className: 'bg-blue-500/10 border-blue-500/30',
      iconColor: 'text-blue-500'
    }
  };

  const { icon: Icon, className, iconColor } = config[type];

  return (
    <Card className={`p-3 md:p-4 ${className} border backdrop-blur`}>
      <div className="flex gap-2 md:gap-3">
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <p className="text-xs md:text-sm text-foreground/90 leading-relaxed">
          {content}
        </p>
      </div>
    </Card>
  );
};

export default NoteCard;