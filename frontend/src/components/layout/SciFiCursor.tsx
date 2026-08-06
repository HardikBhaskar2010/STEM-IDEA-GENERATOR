import React, { useEffect, useState } from "react";

const shouldDisableCustomCursor = () => {
  if (typeof window === "undefined") {return true;}
  const mq = window.matchMedia?.("(hover: none) and (pointer: coarse)");
  return mq ? mq.matches : false;
};

const isInteractive = (el: Element | null) => {
  if (!el) {return false;}
  const interactive = el.closest(
    'a,button,[role="button"],input,select,textarea,label,[data-cursor="pointer"]'
  );
  return Boolean(interactive);
};

export const SciFiCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  // rawPosition always holds the true mouse coordinates, unaffected by
  // the snap-to-element-center logic used for the crosshair wrapper.
  const [rawPosition, setRawPosition] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hoverRect, setHoverRect] = useState<{ w: number; h: number } | null>(
    null
  );
  const [size, setSize] = useState({ w: 26, h: 26 });

  useEffect(() => {
    if (typeof window === "undefined") {return;}

    const disable = shouldDisableCustomCursor();
    setDisabled(disable);
    if (disable) {return;}

    const handleMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      setVisible(true);
      setEnabled(true);
      // Always keep rawPosition in sync with the real pointer
      setRawPosition({ x, y });

      const under = document.elementFromPoint(x, y);
      const interactiveEl = under?.closest(
        'a,button,[role="button"],input,select,textarea,label,[data-cursor="pointer"]'
      );

      if (interactiveEl && isInteractive(interactiveEl)) {
        const rect = interactiveEl.getBoundingClientRect();
        const w = Math.max(18, Math.round(rect.width));
        const h = Math.max(18, Math.round(rect.height));
        setHoverRect({ w, h });
        setSize({ w, h });
        // Wrapper snaps to element center — dot compensates via offset below
        setPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        return;
      }

      setHoverRect(null);
      setSize({ w: 26, h: 26 });
      setPosition({ x, y });
    };

    const handleLeave = () => {
      setVisible(false);
      setPressed(false);
      setHoverRect(null);
      setSize({ w: 26, h: 26 });
    };

    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {return;}
    if (!enabled || disabled) {
      document.documentElement.classList.remove("scifi-cursor-enabled");
      document.body.classList.remove("scifi-cursor-enabled");
      return;
    }
    document.documentElement.classList.add("scifi-cursor-enabled");
    document.body.classList.add("scifi-cursor-enabled");
    return () => {
      document.documentElement.classList.remove("scifi-cursor-enabled");
      document.body.classList.remove("scifi-cursor-enabled");
    };
  }, [enabled, disabled]);

  if (disabled) {return null;}

  // Dot offset = how far the real pointer is from the wrapper center.
  // When not hovering, position === rawPosition so offset is (0, 0) → dot stays centered.
  // When hovering, offset moves the dot to the real cursor hotspot.
  const dotOffsetX = rawPosition.x - position.x;
  const dotOffsetY = rawPosition.y - position.y;

  return (
    <div
      className={[
        "sci-fi-cursor-wrapper",
        visible ? "is-visible" : "",
        enabled ? "is-enabled" : "",
        hoverRect ? "is-hovering" : "",
        pressed ? "is-pressed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) scale(var(--cursor-scale))`,
        width: `${size.w}px`,
        height: `${size.h}px`,
      }}
    >
      <div className="sci-fi-crosshair tl" />
      <div className="sci-fi-crosshair tr" />
      <div className="sci-fi-crosshair bl" />
      <div className="sci-fi-crosshair br" />
      {/* Hotspot dot — offset by (rawPosition - wrapperCenter) so it always
          tracks the real pointer, even when the crosshair is snapped to an element */}
      <div
        className="sci-fi-cursor-dot"
        style={{
          transform: `translate(calc(-50% + ${dotOffsetX}px), calc(-50% + ${dotOffsetY}px))`,
        }}
      />
    </div>
  );
};

export default SciFiCursor;
