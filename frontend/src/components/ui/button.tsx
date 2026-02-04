import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useMicroInteraction } from "@/hooks/useMicroInteraction";
import { useHoverAnimation } from "@/hooks/useHoverAnimation";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  animationType?: 'click' | 'success' | 'error' | 'none';
  enableHover?: boolean;
  ripple?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    animationType = 'click',
    enableHover = true,
    ripple = false,
    onClick,
    ...props 
  }, ref) => {
    const { ref: microRef, trigger } = useMicroInteraction<HTMLButtonElement>({ 
      type: animationType === 'none' ? 'click' : animationType, 
      ripple 
    });
    
    const hoverRef = useHoverAnimation<HTMLButtonElement>({ 
      scale: 1.02, 
      lift: 2, 
      glow: variant === 'default' || variant === 'destructive',
      duration: 150 
    });

    // Combine refs
    const combinedRef = React.useCallback((node: HTMLButtonElement) => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(node);
        } else {
          ref.current = node;
        }
      }
      if (microRef.current !== node) {
        microRef.current = node;
      }
      if (enableHover && hoverRef.current !== node) {
        hoverRef.current = node;
      }
    }, [ref, microRef, hoverRef, enableHover]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (animationType !== 'none') {
        trigger();
      }
      onClick?.(e);
    };

    const Comp = asChild ? Slot : "button";
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={combinedRef} 
        onClick={handleClick}
        {...props} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
