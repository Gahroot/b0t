'use client';

import { useEffect, useState } from 'react';
import { Workflow, Zap, Loader2 } from 'lucide-react';

/**
 * Initial app loading screen shown on page refresh
 * Fades out once the app is hydrated and ready
 */
export function AppLoader() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade-out animation after 2 seconds
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    // Remove component completely after fade animation completes
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2600); // 2000ms delay + 600ms fade duration

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center transition-all duration-[600ms] ease-out"
      style={{
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(0.95)' : 'scale(1)',
      }}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Logo/Icon Area */}
        <div className="relative">
          <div className="flex items-center gap-3">
            {/* Automation Icons with staggered animation */}
            <div className="animate-bounce-subtle" style={{ animationDelay: '0s' }}>
              <Workflow className="h-8 w-8 text-foreground/90" />
            </div>
            <div className="animate-bounce-subtle" style={{ animationDelay: '0.1s' }}>
              <Zap className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>

        {/* App Name */}
        <div className="text-center space-y-2">
          <h1 className="font-black text-2xl tracking-tight">b0t</h1>
          <div className="flex items-center gap-2 justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <p className="text-xs text-secondary">Initializing workflows...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
