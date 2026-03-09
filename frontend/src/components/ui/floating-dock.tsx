/**
 * Floating Dock Component
 * Aceternity UI - Adapted for React + TypeScript
 * A macOS-style floating navigation dock
 */

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";

interface FloatingDockProps {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void; type?: "item" | "divider" }[];
  desktopClassName?: string;
  mobileClassName?: string;
  iconColorClassName?: string;
}

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
  iconColorClassName = "text-neutral-500 dark:text-neutral-300",
}: FloatingDockProps) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} iconColorClassName={iconColorClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} iconColorClassName={iconColorClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
  iconColorClassName,
}: {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void; type?: "item" | "divider" }[];
  className?: string;
  iconColorClassName?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute bottom-full mb-2 inset-x-0 flex flex-col gap-2"
          >
            {items.filter((item) => item.type !== "divider").map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: {
                    delay: idx * 0.05,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                <Link
                  to={item.href}
                  key={item.title}
                  className="h-10 w-10 rounded-full bg-gray-50 dark:bg-neutral-900 flex items-center justify-center"
                  onClick={(e) => {
                    item.onClick?.();
                    if (item.onClick) {
                      e.preventDefault();
                    }
                    setOpen(false);
                  }}
                >
                  <div className="h-4 w-4">{item.icon}</div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="h-10 w-10 rounded-full bg-gray-50 dark:bg-neutral-800 flex items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "text-neutral-500 dark:text-neutral-400 h-5 w-5 transition-transform",
            open && "rotate-45"
          )}
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
  iconColorClassName,
}: {
  items: { title: string; icon: React.ReactNode; href: string; onClick?: () => void; type?: "item" | "divider" }[];
  className?: string;
  iconColorClassName?: string;
}) => {
  let mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto hidden md:flex h-16 gap-3 items-end rounded-2xl bg-gray-50 dark:bg-neutral-900 px-4 pb-3",
        className
      )}
    >
      {items.map((item) =>
        item.type === "divider" ? (
          <div key={item.title} className="w-px h-5 bg-neutral-500/30 dark:bg-neutral-300/30 mb-2 mx-1" aria-hidden="true" />
        ) : (
          <IconContainer mouseX={mouseX} key={item.title} {...item} iconColorClassName={iconColorClassName} />
        )
      )}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
  iconColorClassName,
}: {
  mouseX: any;
  title: string;
  icon: React.ReactNode;
  href: string;
  onClick?: () => void;
  iconColorClassName?: string;
}) {
  let ref = useRef<HTMLDivElement>(null);

  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  let widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  let heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  let widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  let heightTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [20, 40, 20]
  );

  let width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  let widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  let heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  const dockIcon = (
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="aspect-square rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center relative"
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="px-2 py-0.5 whitespace-pre rounded-md bg-gray-100 border dark:bg-neutral-800 dark:border-neutral-900 dark:text-white border-gray-200 text-neutral-700 absolute left-1/2 -translate-x-1/2 -top-8 w-fit text-xs"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center"
        >
          {icon}
        </motion.div>
      </motion.div>
  );

  return (
    <Link
      to={href}
      onClick={(e) => {
        onClick?.();
        if (onClick) {
          e.preventDefault();
        }
      }}
    >
      {dockIcon}
    </Link>
  );
}
