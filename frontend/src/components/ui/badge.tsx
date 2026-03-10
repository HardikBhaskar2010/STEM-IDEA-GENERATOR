import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/20 text-primary hover:bg-primary/30 border-primary/30 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]",
        secondary: "border-transparent bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-cyan-500/30 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]",
        destructive: "border-transparent bg-destructive/20 text-destructive-foreground hover:bg-destructive/30 border-destructive/30 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]",
        outline: "text-foreground border-primary/40 text-primary-foreground/80 hover:bg-primary/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
