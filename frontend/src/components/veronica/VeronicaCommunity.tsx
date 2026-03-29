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
  TrendingUp,
  Flame,
  Clock,
  Eye,
  ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  views: number;
  tags: string[];
  icon: React.FC<{ className?: string }>;
  featured?: boolean;
  hasLiveDemo?: boolean;
  hasCode?: boolean;
  trending?: boolean;
  isNew?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'all',        label: 'All',          emoji: '✨', icon: Sparkles,    color: 'text-primary' },
  { id: 'ai',         label: 'AI',           emoji: '🤖', icon: Bot,         color: 'text-violet-400' },
  { id: 'web',        label: 'Web Apps',     emoji: '🌐', icon: Globe,       color: 'text-sky-400' },
  { id: 'games',      label: 'Games',        emoji: '🎮', icon: Gamepad2,    color: 'text-emerald-400' },
  { id: 'science',    label: 'Science',      emoji: '🔬', icon: FlaskConical, color: 'text-amber-400' },
  { id: 'automation', label: 'Automation',   emoji: '⚙️',  icon: Settings2,   color: 'text-orange-400' },
  { id: 'crazy',      label: 'Crazy Ideas',  emoji: '😏', icon: Lightbulb,   color: 'text-rose-400' },
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
    upvotes: 312, comments: 47, forks: 28, views: 2100,
    tags: ['GPT', 'study', 'productivity'],
    icon: Brain, featured: true, hasLiveDemo: true, hasCode: true, trending: true,
  },
  {
    id: '2', category: 'science',
    title: 'Physics Projectile Simulator',
    description: 'Interactive 2D simulator — enter angle, velocity, and gravity to instantly visualise trajectories. Great for physics class assignment.',
    author: 'Meera Patel', authorInitials: 'MP', authorGradient: 'from-sky-500 to-cyan-600',
    platform: 'Web', difficulty: 'Beginner',
    upvotes: 218, comments: 29, forks: 41, views: 1540,
    tags: ['physics', 'canvas', 'simulation'],
    icon: FlaskConical, featured: true, hasLiveDemo: true, hasCode: true, isNew: true,
  },
  {
    id: '3', category: 'automation',
    title: 'IoT Air Quality Monitor + Grafana',
    description: 'ESP32 reads PM2.5, CO₂, and temperature every 30s. Pushes to InfluxDB, live on Grafana — accessible from your phone.',
    author: 'Dev Krishnan', authorInitials: 'DK', authorGradient: 'from-green-500 to-emerald-600',
    platform: 'ESP32', difficulty: 'Advanced',
    upvotes: 389, comments: 63, forks: 19, views: 3200,
    tags: ['IoT', 'Grafana', 'ESP32'],
    icon: Zap, hasCode: true, trending: true,
  },
  {
    id: '4', category: 'games',
    title: 'Python Snake with Pathfinding AI',
    description: 'Classic Snake but the AI plays itself using BFS pathfinding. Watch it devour the board flawlessly — then compete against it.',
    author: 'Kabir Rawal', authorInitials: 'KR', authorGradient: 'from-indigo-500 to-blue-600',
    platform: 'Python', difficulty: 'Intermediate',
    upvotes: 261, comments: 38, forks: 55, views: 1890,
    tags: ['BFS', 'game', 'AI'],
    icon: Gamepad2, hasLiveDemo: true, hasCode: true,
  },
  {
    id: '5', category: 'crazy',
    title: 'Random Startup Idea Generator',
    description: 'Mash together random problem domains and target audiences — GPT turns them into a full startup idea with a pitch deck outline.',
    author: 'Riya Desai', authorInitials: 'RD', authorGradient: 'from-amber-500 to-orange-600',
    platform: 'Web', difficulty: 'Beginner',
    upvotes: 134, comments: 18, forks: 87, views: 920,
    tags: ['fun', 'GPT', 'startup'],
    icon: Lightbulb, hasLiveDemo: true, hasCode: true, isNew: true,
  },
  {
    id: '6', category: 'ai',
    title: 'Autonomous Line-Following Robot',
    description: 'Car-shaped robot uses a Raspberry Pi camera + OpenCV to follow a coloured line at 0.8 m/s with live obstacle avoidance.',
    author: 'Priya Nair', authorInitials: 'PN', authorGradient: 'from-rose-500 to-pink-600',
    platform: 'Raspberry Pi', difficulty: 'Expert',
    upvotes: 176, comments: 21, forks: 12, views: 1340,
    tags: ['OpenCV', 'robotics', 'vision'],
    icon: Rocket, hasCode: true,
  },
];

const STATS = [
  { icon: Users,    label: 'Builders',       value: '4.2k',  delta: '+12%' },
  { icon: Trophy,   label: 'Projects Shared', value: '1,840', delta: '+8%' },
  { icon: GitFork,  label: 'Remixes',         value: '9.3k',  delta: '+23%' },
  { icon: TrendingUp, label: 'This week',     value: '142',   delta: '+31%' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const AuthorAvatar = ({ initials, gradient }: { initials: string; gradient: string }) => (
  <div className={cn('w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-bold shrink-0', gradient)}>
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
    <Card className="relative border border-[#1e1e2e] bg-[#0d0d14] overflow-hidden hover:border-[#2e2e4e] transition-all duration-300 group cursor-pointer">
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      <CardContent className="p-5 flex flex-col gap-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#151525] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-indigo-500/20 transition-colors">
              <PostIcon className="w-4.5 h-4.5 text-indigo-400" style={{ width: 18, height: 18 }} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">★ Featured</span>
                {post.trending && (
                  <span className="text-[10px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5" /> Trending
                  </span>
                )}
                {post.isNew && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">New</span>
                )}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={cn('text-[10px] border shrink-0', DIFFICULTY_COLOR[post.difficulty])}>
            {post.difficulty}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-bold text-[15px] text-gray-100 leading-snug mb-2 group-hover:text-white transition-colors">
            {post.title}
          </h3>
          <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">{post.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500">#{t}</span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.05]">
          <button onClick={onRemix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 transition-all">
            <Wand2 className="w-3 h-3" />
            Remix
          </button>
          {post.hasCode && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-all">
              <Code2 className="w-3 h-3" />
              Code
            </button>
          )}
          {post.hasLiveDemo && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-all">
              <Play className="w-3 h-3" />
              Demo
            </button>
          )}
        </div>

        {/* Author + social */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AuthorAvatar initials={post.authorInitials} gradient={post.authorGradient} />
            <div>
              <div className="text-[12px] font-medium text-gray-300">{post.author}</div>
              <div className="text-[10px] text-gray-600">{post.platform}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-gray-600">
            <button onClick={onUpvote}
              className={cn('flex items-center gap-1 transition-colors',
                upvoted ? 'text-rose-400' : 'hover:text-rose-400')}>
              <Heart className={cn('w-3.5 h-3.5', upvoted && 'fill-current')} /> {count}
            </button>
            <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.comments}</span>
            <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{post.forks}</span>
            <span className="flex items-center gap-1 text-[11px]"><Eye className="w-3 h-3" />{(post.views / 1000).toFixed(1)}k</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PostCard: React.FC<CardProps> = ({ post, upvoted, count, onUpvote, onRemix }) => {
  const PostIcon = post.icon;
  return (
    <Card className="border border-[#1a1a28] bg-[#0d0d14] overflow-hidden hover:border-[#2a2a3e] transition-all duration-200 group cursor-pointer">
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between">
          <div className="w-8 h-8 rounded-lg bg-[#151525] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-indigo-500/15 transition-colors">
            <PostIcon className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-center gap-1.5">
            {post.isNew && (
              <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">New</span>
            )}
            {post.trending && (
              <span className="text-[9px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Flame className="w-2 h-2" />
              </span>
            )}
            <Badge variant="outline" className={cn('text-[9px] border', DIFFICULTY_COLOR[post.difficulty])}>
              {post.difficulty}
            </Badge>
          </div>
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-[13px] text-gray-200 leading-snug mb-1.5 group-hover:text-white transition-colors line-clamp-2">
            {post.title}
          </h4>
          <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{post.description}</p>
        </div>

        <div className="flex flex-wrap gap-1">
          {post.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-gray-600">#{t}</span>
          ))}
        </div>

        <button onClick={onRemix}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold bg-indigo-500/8 hover:bg-indigo-500/15 text-indigo-400 border border-indigo-500/15 hover:border-indigo-500/30 transition-all"
          style={{ background: 'rgba(99, 102, 241, 0.05)' }}
        >
          <Wand2 className="w-3 h-3" />
          Remix with Veronica
        </button>

        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <AuthorAvatar initials={post.authorInitials} gradient={post.authorGradient} />
            <span className="text-[10px] text-gray-600 truncate max-w-[80px]">{post.author}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-600">
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

// Trending strip — a ranked list of top 3 projects
const TrendingStrip: React.FC<{ posts: CommunityPost[]; onRemix: (post: CommunityPost) => void }> = ({ posts, onRemix }) => (
  <div className="mb-8 rounded-xl border border-[#1a1a28] bg-[#0d0d14] overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04]">
      <Flame className="w-3.5 h-3.5 text-orange-400" />
      <span className="text-[12px] font-bold text-gray-300 tracking-wide">Trending this week</span>
    </div>
    <div className="divide-y divide-white/[0.04]">
      {posts.slice(0, 3).map((post, i) => {
        const PostIcon = post.icon;
        return (
          <div key={post.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
            <span className="text-[13px] font-bold text-gray-700 w-4 shrink-0">{i + 1}</span>
            <div className="w-7 h-7 rounded-lg bg-[#151525] border border-white/[0.06] flex items-center justify-center shrink-0">
              <PostIcon className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-200 truncate group-hover:text-white transition-colors">{post.title}</div>
              <div className="text-[11px] text-gray-600">{post.author} · {post.platform}</div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-600 shrink-0">
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.upvotes}</span>
              <button
                onClick={() => onRemix(post)}
                className="px-2.5 py-1 rounded-md bg-indigo-500/8 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/15 hover:border-indigo-500/30 transition-all text-[10px] font-semibold flex items-center gap-1"
                style={{ background: 'rgba(99, 102, 241, 0.06)' }}
              >
                <Wand2 className="w-2.5 h-2.5" />
                Remix
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface VeronicaCommunityProps {
  onRemixWithVeronica?: (message: string) => void;
}

export const VeronicaCommunity: React.FC<VeronicaCommunityProps> = ({ onRemixWithVeronica }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'trending' | 'new' | 'top'>('trending');
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

  const baseFiltered = activeCategory === 'all'
    ? SEEDED_POSTS
    : SEEDED_POSTS.filter((p) => p.category === activeCategory);

  const sorted = [...baseFiltered].sort((a, b) => {
    if (sortBy === 'new') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
    if (sortBy === 'top') return b.upvotes - a.upvotes;
    return (b.trending ? 1 : 0) - (a.trending ? 1 : 0);
  });

  const featured = sorted.filter((p) => p.featured);
  const rest     = sorted.filter((p) => !p.featured);
  const trendingPosts = SEEDED_POSTS.filter(p => p.trending || p.isNew).slice(0, 3);

  const handleRemix = (post: CommunityPost) => {
    onRemixWithVeronica?.(`Remix this project: "${post.title}" — ${post.description}`);
  };

  return (
    <section className="mt-24 pb-24">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
              <Users className="w-3 h-3" />
              Community Showcase
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
            What builders are shipping
          </h2>
          <p className="text-gray-500 max-w-lg text-[14px] leading-relaxed">
            Explore real projects built with Veronica — try a live demo, fork the code, or remix it into something new.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          {STATS.map(({ icon: Icon, label, value, delta }) => (
            <div key={label} className="flex flex-col items-center justify-center rounded-xl border border-[#1a1a28] bg-[#0d0d14] px-4 py-3 min-w-[80px]">
              <Icon className="w-4 h-4 text-indigo-400 mb-1.5" />
              <div className="text-[18px] font-bold text-white leading-none">{value}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{label}</div>
              <div className="text-[9px] text-emerald-400 mt-1 font-semibold">{delta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trending strip ── */}
      <TrendingStrip posts={trendingPosts} onRemix={handleRemix} />

      {/* ── Filter row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const isActive = cat.id === activeCategory;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all border',
                  isActive
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-transparent border-[#1e1e2e] text-gray-500 hover:bg-white/[0.03] hover:border-[#2e2e3e] hover:text-gray-300'
                )}
              >
                <span className="text-base leading-none">{cat.emoji}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-0 border border-[#1e1e2e] rounded-lg overflow-hidden">
          {([
            { id: 'trending', icon: Flame, label: 'Hot' },
            { id: 'new',      icon: Clock, label: 'New' },
            { id: 'top',      icon: Star,  label: 'Top' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setSortBy(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors',
                sortBy === id
                  ? 'bg-[#151520] text-gray-200'
                  : 'bg-transparent text-gray-600 hover:text-gray-400'
              )}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Featured 2-col ── */}
      {featured.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {featured.map((post) => (
            <FeaturedCard
              key={post.id}
              post={post}
              upvoted={upvoted.has(post.id)}
              count={counts[post.id]}
              onUpvote={() => toggleUpvote(post.id)}
              onRemix={() => handleRemix(post)}
            />
          ))}
        </div>
      )}

      {/* ── Regular grid ── */}
      {rest.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-10">
          {rest.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              upvoted={upvoted.has(post.id)}
              count={counts[post.id]}
              onUpvote={() => toggleUpvote(post.id)}
              onRemix={() => handleRemix(post)}
            />
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">🤔</p>
          <p className="text-[14px] text-gray-600">No projects in this category yet — be the first!</p>
        </div>
      )}

      {/* ── CTA Banner ── */}
      <div className="relative rounded-2xl border border-[#1e1e30] bg-[#0d0d14] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        <div className="relative p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-[17px] text-white">Built something with Veronica?</span>
            </div>
            <p className="text-[13px] text-gray-500 max-w-md leading-relaxed">
              Share it with the community. Let others remix it, learn from it, and improve it.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" className="gap-2 border-[#2e2e40] text-gray-300 hover:border-indigo-500/40 hover:text-white bg-transparent h-10">
              <Share2 className="w-4 h-4" />
              Share Build
            </Button>
            <Button className="gap-2 bg-indigo-500 hover:bg-indigo-600 text-white h-10 shadow-[0_4px_14px_rgba(99,102,241,0.25)]">
              Browse All
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
