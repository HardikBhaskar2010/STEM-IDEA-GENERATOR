import React from 'react';
import Breadcrumb from '@/components/ui/breadcrumb';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  showBreadcrumbs?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  children,
  className,
  showBreadcrumbs = true,
}) => {
  const breadcrumbs = useBreadcrumbs();
  const titleRef = useScrollAnimation<HTMLHeadingElement>({ 
    animation: 'fadeIn', 
    delay: 200 
  });
  const descRef = useScrollAnimation<HTMLParagraphElement>({ 
    animation: 'fadeIn', 
    delay: 300 
  });

  // Don't show breadcrumbs on home page unless there are multiple items
  const shouldShowBreadcrumbs = showBreadcrumbs && breadcrumbs.length > 1;

  return (
    <div className={cn("border-b border-border bg-background/50 backdrop-blur-sm", className)}>
      <div className="container mx-auto px-4">
        {shouldShowBreadcrumbs && (
          <Breadcrumb items={breadcrumbs} showHome={false} />
        )}
        
        {(title || description || children) && (
          <div className="pb-6">
            {title && (
              <h1 
                ref={titleRef.ref}
                className="text-3xl md:text-4xl font-bold text-gradient mb-2"
              >
                {title}
              </h1>
            )}
            
            {description && (
              <p 
                ref={descRef.ref}
                className="text-lg text-muted-foreground max-w-2xl"
              >
                {description}
              </p>
            )}
            
            {children && (
              <div className="mt-4">
                {children}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;