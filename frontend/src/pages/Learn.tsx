'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Search, Menu, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Navbar from '@/components/layout/Navbar';
import { parseLearnContent, Chapter, ContentBlock } from '@/lib/learnParser';
import CodeBlock from '@/components/learn/CodeBlock';
import ChapterCard from '@/components/learn/ChapterCard';
import NoteCard from '@/components/learn/NoteCard';
import PageFlip from '@/components/learn/PageFlip';
import { BackgroundCanvas3D } from '@/components/three/BackgroundCanvas3D';

const Learn: React.FC = () => {
  const [softwareContent, setSoftwareContent] = useState<Chapter[]>([]);
  const [hardwareContent, setHardwareContent] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('software');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [pageFlipDirection, setPageFlipDirection] = useState<'next' | 'prev' | null>(null);

  // Load content on mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        const [softwareRes, hardwareRes] = await Promise.all([
          fetch('/learn/software.txt'),
          fetch('/learn/hardware.txt')
        ]);

        const softwareText = await softwareRes.text();
        const hardwareText = await hardwareRes.text();

        setSoftwareContent(parseLearnContent(softwareText));
        setHardwareContent(parseLearnContent(hardwareText));
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, []);

  const currentContent = activeTab === 'software' ? softwareContent : hardwareContent;
  const filteredContent = currentContent.filter(chapter =>
    chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.content.some(block => 
      block.type === 'text' && block.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleNextChapter = () => {
    if (currentChapter < filteredContent.length - 1) {
      setPageFlipDirection('next');
      setTimeout(() => {
        setCurrentChapter(currentChapter + 1);
        setPageFlipDirection(null);
      }, 300);
    }
  };

  const handlePrevChapter = () => {
    if (currentChapter > 0) {
      setPageFlipDirection('prev');
      setTimeout(() => {
        setCurrentChapter(currentChapter - 1);
        setPageFlipDirection(null);
      }, 300);
    }
  };

  const handleChapterSelect = (index: number) => {
    if (index !== currentChapter) {
      setPageFlipDirection(index > currentChapter ? 'next' : 'prev');
      setTimeout(() => {
        setCurrentChapter(index);
        setPageFlipDirection(null);
      }, 300);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentChapter(0);
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center space-y-3 md:space-y-4">
            <BookOpen className="w-12 h-12 md:w-16 md:h-16 mx-auto animate-pulse text-primary" />
            <p className="text-base md:text-lg text-muted-foreground">Loading educational content...</p>
          </div>
        </div>
      </div>
    );
  }

  const chapter = filteredContent[currentChapter];

  return (
    <div className="min-h-screen bg-background relative">
      {/* 3D Particle Background */}
      <BackgroundCanvas3D density="medium" className="opacity-40" />
      
      <Navbar />\n      \n      <div className="pt-20 pb-8 px-3 md:px-4 relative z-10">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 md:mb-12 text-center space-y-4 md:space-y-6">
            <div className="inline-flex items-center space-x-3 px-6 py-2.5 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 border border-primary/20 rounded-2xl backdrop-blur-sm">
              <BookOpen className="w-6 h-6 text-primary animate-pulse" />
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-gradient">Knowledge Synthesis Hub</h1>
            </div>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-6 leading-relaxed">
              Master the dual nature of modern engineering. Navigate through curated modules on Software and Hardware fundamentals.
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6 md:space-y-8">
            <div className="flex justify-center">
              <TabsList className="bg-muted/50 p-1.5 border border-border/50 w-full max-w-md md:w-auto rounded-2xl h-14">
                <TabsTrigger 
                  value="software" 
                  className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow flex-1 md:flex-none text-xs md:text-sm font-bold h-full px-8 transition-all duration-300"
                >
                  <span className="mr-2">💻</span> Logic & Software
                </TabsTrigger>
                <TabsTrigger 
                  value="hardware" 
                  className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow flex-1 md:flex-none text-xs md:text-sm font-bold h-full px-8 transition-all duration-300"
                >
                  <span className="mr-2">🔧</span> Physical Hardware
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="space-y-4 md:space-y-6">
              {/* Search Bar */}
              <div className="flex gap-2 md:gap-4">
                <div className="relative flex-1 max-w-md mx-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search chapters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 md:pl-10 bg-card border-border text-sm md:text-base h-9 md:h-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden h-9 w-9"
                >
                  {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </Button>
              </div>

              {/* Main Content Layout */}
              <div className="grid md:grid-cols-[280px,1fr] lg:grid-cols-[300px,1fr] gap-4 md:gap-6">
                {/* Sidebar - Chapter Navigation */}
                <div className={`${sidebarOpen ? 'block' : 'hidden md:block'}`}>
                  <Card className="p-3 md:p-4 bg-card/50 backdrop-blur border-border md:sticky md:top-24">
                    <h3 className="font-semibold mb-3 md:mb-4 text-xs md:text-sm uppercase tracking-wider text-muted-foreground">
                      Table of Contents
                    </h3>
                    <ScrollArea className="h-[300px] md:h-[calc(100vh-250px)]">
                      <div className="space-y-1.5 md:space-y-2">
                        {filteredContent.map((ch, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              handleChapterSelect(index);
                              setSidebarOpen(false); // Close sidebar on mobile after selection
                            }}
                            data-testid={`chapter-nav-${index}`}
                            className={`
                              w-full text-left px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg transition-all duration-200
                              ${currentChapter === index 
                                ? 'bg-gradient-primary text-white shadow-glow' 
                                : 'hover:bg-muted text-foreground'
                              }
                            `}
                          >
                            <div className="text-[10px] md:text-xs font-medium opacity-70 mb-0.5 md:mb-1">Chapter {ch.number}</div>
                            <div className="text-xs md:text-sm font-semibold line-clamp-2">{ch.title}</div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>

                <div className="relative group">
                  <PageFlip direction={pageFlipDirection}>
                    <Card 
                      className="p-6 md:p-8 lg:p-12 bg-card/40 backdrop-blur-md border-primary/10 shadow-glow min-h-[550px] md:min-h-[650px] rounded-3xl overflow-hidden relative"
                      data-testid="book-content"
                    >
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                      
                      {chapter ? (
                        <div className="space-y-6 md:space-y-8 h-full flex flex-col relative z-10">
                          {/* Chapter Header */}
                          <div className="border-b border-primary/10 pb-6 md:pb-8">
                            <div className="flex items-center gap-2 text-xs md:text-sm font-black text-primary uppercase tracking-[0.2em] mb-3">
                              <span className="w-8 h-px bg-primary/30" />
                              Module {chapter.number}
                            </div>
                            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 text-gradient leading-tight">
                              {chapter.title}
                            </h2>
                            <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground/60 font-medium">
                              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {filteredContent.length} Modules</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span className="flex items-center gap-1.5">📄 Page {currentChapter + 1} / {filteredContent.length}</span>
                            </div>
                          </div>

                          {/* Chapter Content */}
                          <ScrollArea className="flex-1 pr-4 md:pr-6">
                            <div className="space-y-6 md:space-y-10 py-4">
                              {chapter.content.map((block, index) => (
                                <ChapterCard key={index} block={block} />
                              ))}
                            </div>
                          </ScrollArea>

                          {/* Navigation Footer */}
                          <div className="flex items-center justify-between pt-6 md:pt-8 border-t border-primary/10 mt-auto">
                            <Button
                              onClick={handlePrevChapter}
                              disabled={currentChapter === 0}
                              variant="ghost"
                              className="group/btn gap-2 h-12 px-6 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                              data-testid="prev-chapter-btn"
                            >
                              <ChevronLeft className="w-5 h-5 group-hover/btn:-translate-x-1 transition-transform" />
                              <span className="font-bold">Previous Module</span>
                            </Button>
                            
                            <div className="hidden md:flex gap-3 px-6 py-2 bg-muted/30 rounded-full border border-border/50">
                              {filteredContent.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleChapterSelect(index)}
                                  className={`
                                    w-2.5 h-2.5 rounded-full transition-all duration-500 flex-shrink-0
                                    ${currentChapter === index 
                                      ? 'bg-primary w-10 shadow-glow' 
                                      : 'bg-muted-foreground/20 hover:bg-muted-foreground/40'
                                    }
                                  `}
                                  aria-label={`Go to module ${index + 1}`}
                                />
                              ))}
                            </div>

                            <Button
                              onClick={handleNextChapter}
                              disabled={currentChapter === filteredContent.length - 1}
                              variant="ghost"
                              className="group/btn gap-2 h-12 px-6 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                              data-testid="next-chapter-btn"
                            >
                              <span className="font-bold">Next Module</span>
                              <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 md:py-12">
                          <BookOpen className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-muted-foreground" />
                          <p className="text-base md:text-lg text-muted-foreground">No chapters found matching your search.</p>
                        </div>
                      )}
                    </Card>
                  </PageFlip>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Learn;