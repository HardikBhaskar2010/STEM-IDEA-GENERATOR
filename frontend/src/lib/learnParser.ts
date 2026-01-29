export interface ContentBlock {
  type: 'heading' | 'text' | 'code' | 'list' | 'note' | 'separator';
  content: string;
  language?: string;
  level?: number;
}

export interface Chapter {
  number: number;
  title: string;
  content: ContentBlock[];
}

export function parseLearnContent(text: string): Chapter[] {
  const lines = text.split('\n');
  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  let currentBlock: ContentBlock | null = null;
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = 'cpp';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        if (currentChapter) {
          currentChapter.content.push({
            type: 'code',
            content: codeContent.join('\n'),
            language: codeLanguage
          });
        }
        codeContent = [];
        inCodeBlock = false;
      } else {
        // Start of code block
        codeLanguage = line.replace('```', '').trim() || 'cpp';
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Chapter heading (## Chapter X:)
    if (line.match(/^## Chapter \d+:/)) {
      if (currentChapter) {
        chapters.push(currentChapter);
      }
      const match = line.match(/^## Chapter (\d+): (.+)$/);
      if (match) {
        currentChapter = {
          number: parseInt(match[1]),
          title: match[2].trim(),
          content: []
        };
      }
      continue;
    }

    // Section heading (###)
    if (line.startsWith('### ')) {
      if (currentChapter) {
        currentChapter.content.push({
          type: 'heading',
          content: line.replace('### ', ''),
          level: 3
        });
      }
      continue;
    }

    // Subheading (####)
    if (line.startsWith('#### ')) {
      if (currentChapter) {
        currentChapter.content.push({
          type: 'heading',
          content: line.replace('#### ', ''),
          level: 4
        });
      }
      continue;
    }

    // Separator (---)
    if (line.trim() === '---') {
      if (currentChapter) {
        currentChapter.content.push({
          type: 'separator',
          content: ''
        });
      }
      continue;
    }

    // List items (- or *)
    if (line.match(/^[\-\*] /)) {
      if (currentChapter) {
        // Check if previous block was a list, if so append to it
        const lastBlock = currentChapter.content[currentChapter.content.length - 1];
        if (lastBlock && lastBlock.type === 'list') {
          lastBlock.content += '\n' + line;
        } else {
          currentChapter.content.push({
            type: 'list',
            content: line
          });
        }
      }
      continue;
    }

    // Note/emphasis (lines starting with **)
    if (line.match(/^\*\*[^*]+\*\*/)) {
      if (currentChapter) {
        currentChapter.content.push({
          type: 'note',
          content: line.replace(/\*\*/g, '')
        });
      }
      continue;
    }

    // Regular text
    if (line.trim()) {
      if (currentChapter) {
        // Combine consecutive text lines into paragraphs
        const lastBlock = currentChapter.content[currentChapter.content.length - 1];
        if (lastBlock && lastBlock.type === 'text' && !line.startsWith('#')) {
          lastBlock.content += ' ' + line.trim();
        } else {
          currentChapter.content.push({
            type: 'text',
            content: line.trim()
          });
        }
      }
    }
  }

  // Push the last chapter
  if (currentChapter) {
    chapters.push(currentChapter);
  }

  return chapters;
}