import React from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'cpp' }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute top-1.5 md:top-2 right-1.5 md:right-2 z-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-7 w-7 md:h-8 md:w-8 p-0"
        >
          {copied ? (
            <Check className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
          ) : (
            <Copy className="w-3 h-3 md:w-4 md:h-4" />
          )}
        </Button>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-border bg-black/40">
        <div className="flex items-center justify-between px-3 md:px-4 py-1.5 md:py-2 bg-muted/30 border-b border-border">
          <span className="text-[10px] md:text-xs font-mono text-muted-foreground uppercase">{language}</span>
        </div>
        <pre className="p-3 md:p-4 overflow-x-auto">
          <code className="text-xs md:text-sm font-mono text-foreground break-all md:break-normal">{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;