'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Workflow } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Social Media', href: '/social-media' },
  { name: 'Content', href: '/content' },
  { name: 'Activity', href: '/dashboard/activity' },
  { name: 'Limits', href: '/dashboard/limits' },
  { name: 'Settings', href: '/settings' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/50 bg-background">
      <div className="flex h-16 items-center px-8">
        {/* Left: Logo */}
        <Link href="/dashboard" className="flex items-center group">
          <Workflow className="h-[18px] w-[18px] text-foreground/90 transition-all duration-200 group-hover:text-foreground group-hover:scale-110" />
        </Link>

        {/* Center-Left: Brand Name */}
        <div className="ml-2 flex-shrink-0">
          <span className="text-[13px] font-light tracking-tight text-muted-foreground/60">
            b0t
          </span>
        </div>

        {/* Right: Navigation Links */}
        <div className="ml-auto flex items-center gap-8">
          {navigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  text-[13px] font-light tracking-tight transition-all duration-200
                  ${
                    isActive
                      ? 'text-foreground/90'
                      : 'text-muted-foreground/60 hover:text-foreground/90'
                  }
                `}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
