'use client';

import { useEffect } from 'react';
import Image from 'next/image';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an observability provider (e.g. Sentry)
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="relative mb-8 h-20 w-20">
        <Image
          src="/icon.png"
          alt="LexxTech Logo"
          fill
          className="object-contain opacity-40 grayscale blur-[1px]"
        />
      </div>

      <h1 className="text-4xl font-extrabold text-error mb-4">Interference Detected</h1>
      <p className="text-on-surface-variant max-w-sm mb-10 text-lg">
        An unexpected error occurred in your gravity well. 
        Don't worry, your data is safe.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg active:scale-95"
        >
          Reset Orbit
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-surface-container border border-outline rounded-xl hover:bg-surface-container-high transition-all"
        >
          Return Home
        </button>
      </div>
    </main>
  );
}
