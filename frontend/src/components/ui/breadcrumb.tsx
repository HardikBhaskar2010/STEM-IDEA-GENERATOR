import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  className?: string;
  showHome?: boolean;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <ChevronRight className="w-4 h-4 text-muted-foreground" />,
  maxItems = 4,
  className,
  showHome = true,
}) => {
  const breadcrumbRef = useScrollAnimation<HTMLNavElement>({ 
    animation: 'fadeIn', 
    delay: 100 
  });

  // Add home item if showHome is true and not already present
  const allItems = showHome && items[0]?.path !== '/' 
    ? [{ label: 'Home', path: '/', icon: Home }, ...items]
    : items;

  // Truncate items if they exceed maxItems
  const displayItems = allItems.length > maxItems
    ? [
        allItems[0],
        { label: '...', path: '', icon: undefined },
        ...allItems.slice(-maxItems + 2)
      ]
    : allItems;

  return (
    <nav 
      ref={breadcrumbRef.ref}
      className={cn(
        "flex items-center space-x-1 text-sm text-muted-foreground py-4",
        className
      )}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';
          const Icon = item.icon;

          return (
            <li key={`${item.path}-${index}`} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 flex-shrink-0">
                  {separator}
                </span>
              )}
              
              {isEllipsis ? (
                <span className="px-2 py-1 text-muted-foreground">
                  {item.label}
                </span>
              ) : isLast ? (
                <span 
                  className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-md",
                    "text-foreground font-medium bg-muted/50"
                  )}
                  aria-current="page"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </span>
              ) : (
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-md",
                    "hover:text-foreground hover:bg-muted/50 transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;