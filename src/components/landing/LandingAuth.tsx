'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/MotionLink';
import { LogIn, Store } from 'lucide-react';

interface AuthUser {
  name: string;
  role: 'ADMIN' | 'BUSINESS';
}

let cachedUserPromise: Promise<AuthUser | null> | null = null;

function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!cachedUserPromise) {
    cachedUserPromise = fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          return data.user || null;
        }
        return null;
      })
      .catch(() => null);
  }
  return cachedUserPromise;
}

function useCurrentUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    fetchCurrentUser().then((currentUser) => {
      if (active && currentUser) {
        setUser(currentUser);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return user;
}

export function LandingAuthHeader({ className }: { className?: string }) {
  const user = useCurrentUser();

  if (user) {
    const destination = user.role === 'ADMIN' ? '/admin' : '/dashboard';
    const label = user.role === 'ADMIN' ? 'Admin' : 'Dashboard';
    return (
      <Link
        href={destination}
        className={className}
        title={`Signed in as ${user.name}`}
      >
        <Store size={15} />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link href="/login" className={className}>
      Sign in
    </Link>
  );
}

export function LandingAuthMobileNav() {
  const user = useCurrentUser();

  if (user) {
    const destination = user.role === 'ADMIN' ? '/admin' : '/dashboard';
    const label = user.role === 'ADMIN' ? 'Admin' : 'Dashboard';
    return (
      <Link href={destination} title={`Signed in as ${user.name}`}>
        <Store size={18} />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link href="/login">
      <LogIn size={18} />
      <span>Sign in</span>
    </Link>
  );
}
