import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Heart,
  MessageSquare,
  Share2,
  Sparkles,
  Cpu,
  Zap,
  Globe,
  Rocket,
  Star,
  ArrowRight,
  Users,
  Trophy,
  GitFork,
  Play,
  Wand2,
  Code2,
  Brain,
  Gamepad2,
  FlaskConical,
  Bot,
  Settings2,
  Lightbulb,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = {
  id: string;
  label: string;
  emoji: string;
  icon: React.FC<{ className?: string }>;
  color: string;
};

type CommunityPost = {
  id: string;
  title: string;
  description: string;
  author: string;
  authorInitials: string;
  authorGradient: string;
  platform: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  upvotes: number;
  comments: number;
  forks: number;
  tags: string[];
  icon: React.FC<{ className?: string }>;
  featured?: boolean;
  hasLiveDemo?: boolean;
  hasCode?: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'all',        label: 'All',        emoji: '✨', icon: Sparkles,    color: 'text-primary' },
  { id: 'ai',         label: 'AI',         emoji: '🤖', icon: Bot,         color: 'text-violet-400' },
  { id: 'web',        label: 'Web Apps',   emoji: '🌐', icon: Globe,       color: 'text-sky-400' },
  { id: 'games',      label: 'Games',      emoji: '🎮', icon: Gamepad2,    color: 'text-emerald-400' },
  { id: 'science',    label: 'Science',    emoji: '🔬', icon: FlaskConical, color: 'text-amber-400' },
  { id: 'automation', label: 'Automation', emoji: '⚙️',  icon: Settings2,   color: 'text-orange-400' },
  { id: 'crazy',      label: 'Crazy Ideas',emoji: '😏', icon: Lightbulb,   color: 'text-rose-400' },
];

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Intermediate: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  Advanced:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Expert:       'bg-rose-500/10   text-rose-400   border-rose-500/20',
};

const SEEDED_POSTS: CommunityPost[] = [
  {
    id: '1', category: 'ai',
    title: 'AI Study Planner using GPT-4o',
    description: 'Chat with Veronica, get a full 4-week STEM study plan in seconds. Includes daily tasks, quizzes, and auto-adjusts when you fall behind.',
    author: 'Arjun Sharma', authorInitials: 'AS', authorGradient: 'from-violet-500 to-purple-600',
    platform: 'Web', difficulty: 'Intermediate',
    upvotes: 312, comments: 47, forks: 28,
    tags: ['GPT', 'study', 'productivity'],
    icon: Brain, featured: true, hasLiveDemo: true, hasCode: true,
  },
  {
    id: '2', category: 'science',
    title: 'Physics Projectile Simulator',
    description: 'Interactive 2D simulator — enter angle, velocity, and gravity to instantly visualise trajectories. Great for physics class assignment.',
    author: 'Meera Patel', authorInitials: 'MP', authorGradient: 'from-sky-500 to-cyan-600',
    platform: 'Web', difficulty: 'Beginner',
    upvotes: 218, comments: 29, forks: 41,
    tags: ['physics', 'canvas', 'simulation'],
    icon: FlaskConical, featured: true, hasLiveDemo: true, hasCode: true,
  },
  {
    id: '3', category: 'automation',
    title: 'IoT Air Quality Monitor + Grafana',
    description: 'ESP32 reads PM2.5, CO₂, and temperature every 30s. Pushes to InfluxDB, live on Grafana — accessible from your phone.',
    author: 'Dev Krishnan', authorInitials: 'DK', authorGradient: 'from-green-500 to-emerald-600',
    platform: 'ESP32', difficulty: 'Advanced',
    upvotes: 389, comments: 63, forks: 19,
    tags: ['IoT', 'Grafana', 'ESP32'],
    icon: Zap, hasCode: true,
  },
  {
    id: '4', category: 'games',
    title: 'Python Snake with Pathfinding AI',
    description: 'Classic Snake but the AI plays itself using BFS pathfinding. Watch it devour the board flawlessly — then compete against it.',
    author: 'Kabir Rawal', authorInitials: 'KR', authorGradient: 'from-indigo-500 to-blue-600',
    platform: 'Python', difficulty: 'Intermediate',
    upvotes: 261, comments: 38, forks: 55,
    tags: ['BFS', 'game', 'AI'],
    icon: Gamepad2, hasLiveDemo: true, hasCode: true,
  },
  {
    id: '5', category: 'crazy',
    title: 'Random Startup Idea Generator',
    description: 'Mash together random problem domains and target audiences — GPT turns them into a full startup idea with a pitch deck outline.',
    author: 'Riya Desai', authorInitials: 'RD', authorGradient: 'from-amber-500 to-orange-600',
    platform: 'Web', difficulty: 'Beginner',
    upvotes: 134, comments: 18, forks: 87,
    tags: ['fun', 'GPT', 'startup'],
    icon: Lightbulb, hasLiveDemo: true, hasCode: true,
  },
  {
    id: '6', category: 'ai',
    title: 'Autonomous Line-Following Robot (OpenCV)',
    description: 'Car-shaped robot uses a Raspberry Pi camera + OpenCV to follow a coloured line at 0.8 m/s with live obstacle avoidance.',
    author: 'Priya Nair', authorInitials: 'PN', authorGradient: 'from-rose-500 to-pink-600',
    platform: 'Raspberry Pi', difficulty: 'Expert',
    upvotes: 176, comments: 21, forks: 12,
    tags: ['OpenCV', 'robotics', 'vision'],
    icon: Robot, hasCode: true,
  },
];

function Robot({ className }: { className?: string }) {
  return <Rocket className={className} />;
}

const STATS = [
  { icon: Users,   label: 'Builders',       value: '4.2k' },
  { icon: Trophy,  label: 'Projects Shared', value: '1,840' },
  { icon: GitFork, label: 'Remixes',         value: '9.3k' },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface VeronicaCommunityProps {
  /** Called when user clicks "Remix with Veronica" — passes the project title as a seed message */
  onRemixWithVeronica?: (message: string) => void;
}

export const VeronicaCommunity: React.FC<VeronicaCommunityProps> = ({ onRemixWithVeronica }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(SEEDED_POSTS.map((p) => [p.id, p.upvotes]))
  );

  const toggleUpvote = (id: string) => {
    setUpvoted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setCounts((c) => ({ ...c, [id]: c[id] - 1 })); }
      else               { next.add(id);    setCounts((c) => ({ ...c, [id]: c[id] + 1 })); }
      return next;
    });
  };

  const filtered = activeCategory === 'all'
    ? SEEDED_POSTS
    : SEEDED_POSTS.filter((p) => p.category === activeCategory);

  const featured = filtered.filter((p) => p.featured);
  const rest     = filtered.filter((p) => !p.featured);

  return (
    <section className="mt-20 pb-24">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-xs uppercase tracking-wide mb-3">
            Community Explore
          </Badge>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight flex items-center gap-2">
            <span className="text-gradient">Builder Showcase</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            Explore what others are building — try it, remix it, improve it with Veronica.
          </p>
        </div>
        <div className="flex gap-6 shrink-0">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 mx-auto mb-1">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-lg font-bold">{value}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category pills ── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border',
                isActive
                  ? 'bg-primary/10 border-primary/30 text-primary shadow-sm'
                  : 'bg-background/60 border-primary/10 text-muted-foreground hover:bg-primary/5 hover:border-primary/20'
              )}
            >
              <span>{cat.emoji}</span>
              <CatIcon className={cn('w-3 h-3', isActive ? 'text-primary' : cat.color)} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ── Featured 2-col ── */}
      {featured.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          {featured.map((post) => (
            <FeaturedCard
              key={post.id}
              post={post}
              upvoted={upvoted.has(post.id)}
              count={counts[post.id]}
              onUpvote={() => toggleUpvote(post.id)}
              onRemix={() => onRemixWithVeronica?.(`Remix this project: "${post.title}" — ${post.description}`)}
            />
          ))}
        </div>
      )}

      {/* ── Regular grid ── */}
      {rest.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
          {rest.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              upvoted={upvoted.has(post.id)}
              count={counts[post.id]}
              onUpvote={() => toggleUpvote(post.id)}
              onRemix={() => onRemixWithVeronica?.(`Remix this project: "${post.title}" — ${post.description}`)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-4xl mb-3">🤔</p>
          <p className="text-sm">No projects in this category yet — be the first!</p>
        </div>
      )}

      {/* ── Share CTA ── */}
      <Card className="glass-effect border-primary/20 bg-gradient-to-br from-primary/5 via-background/80 to-background/40 backdrop-blur overflow-hidden">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-lg">Built something with Veronica?</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-md">
              Share it, let others remix it, and help the next STEM builder level up.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" className="gap-2 border-primary/20 hover:border-primary/40">
              <Share2 className="w-4 h-4" />
              Share Your Build
            </Button>
            <Button className="gap-2 bg-gradient-primary text-white shadow-lg">
              Browse All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const AuthorAvatar = ({ initials, gradient }: { initials: string; gradient: string }) => (
  <div className={cn('w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0', gradient)}>
    {initials}
  </div>
);

interface CardProps {
  post: CommunityPost;
  upvoted: boolean;
  count: number;
  onUpvote: () => void;
  onRemix: () => void;
}

const FeaturedCard: React.FC<CardProps> = ({ post, upvoted, count, onUpvote, onRemix }) => {
  const PostIcon = post.icon;
  return (
    <Card className="glass-effect border-primary/20 bg-background/70 backdrop-blur overflow-hidden hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 group">
      <CardContent className="p-6 flex flex-col gap-4 h-full">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <PostIcon className="w-4 h-4 text-primary" />
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">★ Featured</Badge>
          </div>
          <Badge variant="outline" className={cn('text-[10px] border', DIFFICULTY_COLOR[post.difficulty])}>
            {post.difficulty}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-bold text-base leading-snug mb-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3">{post.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">#{t}</span>
            ))}
          </div>
        </div>

        {/* Veronica action buttons */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-primary/10">
          <Button size="sm" onClick={onRemix}
            className="h-7 px-3 text-[11px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 gap-1">
            <Wand2 className="w-3 h-3" />
            Remix with Veronica
          </Button>
          {post.hasCode && (
            <Button size="sm" variant="ghost"
              className="h-7 px-3 text-[11px] hover:bg-primary/5 text-muted-foreground gap-1">
              <Code2 className="w-3 h-3" />
              View Code
            </Button>
          )}
          {post.hasLiveDemo && (
            <Button size="sm" variant="ghost"
              className="h-7 px-3 text-[11px] hover:bg-primary/5 text-muted-foreground gap-1">
              <Play className="w-3 h-3" />
              Live Demo
            </Button>
          )}
        </div>

        {/* Author + social */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AuthorAvatar initials={post.authorInitials} gradient={post.authorGradient} />
            <div>
              <div className="text-xs font-medium">{post.author}</div>
              <div className="text-[10px] text-muted-foreground">{post.platform}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <button onClick={onUpvote}
              className={cn('flex items-center gap-1 px-2 py-1 rounded-full transition-all',
                upvoted ? 'bg-rose-500/15 text-rose-400' : 'hover:bg-rose-500/10 hover:text-rose-400')}>
              <Heart className={cn('w-3.5 h-3.5', upvoted && 'fill-current')} /> {count}
            </button>
            <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.comments}</span>
            <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{post.forks}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PostCard: React.FC<CardProps> = ({ post, upvoted, count, onUpvote, onRemix }) => {
  const PostIcon = post.icon;
  return (
    <Card className="glass-effect border-primary/10 bg-background/60 backdrop-blur overflow-hidden hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 group">
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <PostIcon className="w-3.5 h-3.5 text-primary" />
          </div>
          <Badge variant="outline" className={cn('text-[9px] border', DIFFICULTY_COLOR[post.difficulty])}>
            {post.difficulty}
          </Badge>
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-sm leading-snug mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h4>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{post.description}</p>
        </div>

        <div className="flex flex-wrap gap-1">
          {post.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">#{t}</span>
          ))}
        </div>

        {/* Veronica remix button */}
        <button onClick={onRemix}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium bg-primary/5 hover:bg-primary/15 text-primary border border-primary/10 hover:border-primary/30 transition-all">
          <Wand2 className="w-3 h-3" />
          Remix with Veronica
        </button>

        <div className="flex items-center justify-between pt-1 border-t border-primary/5">
          <div className="flex items-center gap-1.5">
            <AuthorAvatar initials={post.authorInitials} gradient={post.authorGradient} />
            <span className="text-[10px] text-muted-foreground truncate max-w-[70px]">{post.author}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <button onClick={onUpvote}
              className={cn('flex items-center gap-0.5 transition-colors',
                upvoted ? 'text-rose-400' : 'hover:text-rose-400')}>
              <Heart className={cn('w-3 h-3', upvoted && 'fill-current')} /> {count}
            </button>
            <span className="flex items-center gap-0.5"><GitFork className="w-3 h-3" />{post.forks}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
