import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-on-surface px-6 text-center">
      <div className="relative mb-8 h-24 w-24">
        <Image
          src="/icon.png"
          alt="LexxTech Logo"
          fill
          className="object-contain opacity-50 grayscale"
          priority
        />
      </div>
      
      <h1 className="text-6xl font-black text-primary mb-4 tracking-tighter">404</h1>
      <h2 className="text-2xl font-bold mb-2">Lost in Gravitation?</h2>
      <p className="text-on-surface-variant max-w-md mb-8 leading-relaxed">
        The page you are looking for has been pulled into another dimension or never existed. 
        Let's get you back to the workspace.
      </p>

      <Link 
        href="/"
        className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary-dim transition-all active:scale-95 shadow-lg shadow-primary/20"
      >
        Return to Orbit
      </Link>
    </main>
  );
}
