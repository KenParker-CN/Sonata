'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';

type ThemeSelection = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';
type Direction = 'btt' | 'ttb' | 'ltr' | 'rtl' | 'circular';

type ChildrenRender =
  | React.ReactNode
  | ((state: {
      resolved: Resolved;
      effective: ThemeSelection;
      toggleTheme: (theme: ThemeSelection) => void;
      /** Anchors the circular view-transition origin to the toggling button. */
      buttonRef: React.RefObject<HTMLButtonElement | null>;
    }) => React.ReactNode);

function getSystemEffective(): Resolved {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getClipKeyframes(direction: Direction): [string, string] {
  switch (direction) {
    case 'ltr':
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
    case 'rtl':
      return ['inset(0 0 0 100%)', 'inset(0 0 0 0)'];
    case 'ttb':
      return ['inset(0 0 100% 0)', 'inset(0 0 0 0)'];
    case 'btt':
      return ['inset(100% 0 0 0)', 'inset(0 0 0 0)'];
    case 'circular':
      return ['circle(0% at 50% 50%)', 'circle(150% at 50% 50%)'];
    default:
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
  }
}

function getCircularClipPath(originX: number, originY: number, progress: number): string {
  const radius = progress * 150;
  return `circle(${radius}% at ${originX}px ${originY}px)`;
}

type ThemeTogglerProps = {
  theme: ThemeSelection;
  resolvedTheme: Resolved;
  setTheme: (theme: ThemeSelection) => void;
  direction?: Direction;
  onImmediateChange?: (theme: ThemeSelection) => void;
  children?: ChildrenRender;
};

function ThemeToggler({
  theme,
  resolvedTheme,
  setTheme,
  onImmediateChange,
  direction = 'ltr',
  children,
  ...props
}: ThemeTogglerProps) {
  const [current, setCurrent] = React.useState<{
    effective: ThemeSelection;
    resolved: Resolved;
  }>({
    effective: theme,
    resolved: resolvedTheme,
  });

  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [fromClip, toClip] = getClipKeyframes(direction);

  const toggleTheme = React.useCallback(
    async (theme: ThemeSelection) => {
      const resolved = theme === 'system' ? getSystemEffective() : theme;

      setCurrent({ effective: theme, resolved });
      onImmediateChange?.(theme);

      if (theme === 'system' && resolved === resolvedTheme) {
        setTheme(theme);
        return;
      }

      if (!document.startViewTransition) {
        setTheme(theme);
        return;
      }

      const button = buttonRef.current;
      let originX = window.innerWidth / 2;
      let originY = window.innerHeight / 2;

      if (button && direction === 'circular') {
        const rect = button.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
      }

      // Capture old snapshot, then synchronously update React state AND DOM
      // so the new snapshot captures the fully re-rendered app with new theme
      await document.startViewTransition(() => {
        flushSync(() => {
          // Update React state - this triggers synchronous re-render with new theme
          setTheme(theme);
          // Also update DOM attribute immediately for any CSS that depends on it
          document.documentElement.dataset.theme = resolved;
        });
      }).ready;

      // Animate the new snapshot revealing from the button center
      if (direction === 'circular' && button) {
        document.documentElement
          .animate(
            {
              clipPath: [
                getCircularClipPath(originX, originY, 0),
                getCircularClipPath(originX, originY, 1),
              ],
            },
            {
              duration: 700,
              easing: 'ease-in-out',
              pseudoElement: '::view-transition-new(root)',
            },
          )
          .finished.finally(() => {
            // Cleanup - transition complete
          });
      } else {
        document.documentElement
          .animate(
            { clipPath: [fromClip, toClip] },
            {
              duration: 700,
              easing: 'ease-in-out',
              pseudoElement: '::view-transition-new(root)',
            },
          )
          .finished.finally(() => {
            // Cleanup
          });
      }
    },
    [onImmediateChange, resolvedTheme, fromClip, toClip, setTheme, direction],
  );

  return (
    <React.Fragment {...props}>
      {typeof children === 'function'
        ? children({
            effective: current.effective,
            resolved: current.resolved,
            toggleTheme,
            buttonRef,
          })
        : children}
      <style>{`::view-transition-old(root), ::view-transition-new(root){animation:none;mix-blend-mode:normal;}`}</style>
    </React.Fragment>
  );
}

export {
  ThemeToggler,
  type ThemeTogglerProps,
  type ThemeSelection,
  type Resolved,
  type Direction,
};
