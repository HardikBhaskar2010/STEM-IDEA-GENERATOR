// Team Info Card Skeleton - Loading state
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

export const TeamInfoCardSkeleton: React.FC = () => {
  return (
    <Card data-testid="team-info-card-skeleton">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6" />
              <Skeleton className="h-8 w-48" />
            </CardTitle>
            <CardDescription className="mt-2">
              <Skeleton className="h-4 w-32" />
            </CardDescription>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
};
