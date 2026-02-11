// Submission History Component
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Submission } from '@/services/competitionService';
import { Calendar, ThumbsUp, Award } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SubmissionHistoryProps {
  submissions: Submission[];
}

export const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({ submissions }) => {
  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submission History</CardTitle>
          <CardDescription>Your competition submissions will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No submissions yet</p>
            <p className="text-sm mt-2">Generate an idea and submit it to earn points!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="submission-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Submission History
        </CardTitle>
        <CardDescription>
          {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="border-l-4 border-l-primary" data-testid="submission-card">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-semibold text-lg">{submission.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {submission.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {submission.category}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(submission.submitted_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{submission.vote_count || 0} upvotes</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Award className="h-4 w-4" />
                      <span className="font-semibold">{submission.points} points</span>
                    </div>

                    {submission.is_manual && (
                      <Badge variant="secondary" className="text-xs">
                        Manual
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
