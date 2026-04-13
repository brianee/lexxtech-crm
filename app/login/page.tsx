'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-tertiary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-surface-container-low border border-outline/20 rounded-3xl p-10 shadow-2xl">
          {/* Logo */}
          <div className="mb-10">
            <span className="text-3xl font-black tracking-tighter text-primary font-headline">
              lexxtech
            </span>
            <p className="text-[11px] font-bold tracking-[0.25em] text-on-surface-variant uppercase mt-1">
              Personal Workspace
            </p>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">
            Welcome back.
          </h1>
          <p className="text-on-surface-variant text-sm font-medium mb-10 leading-relaxed">
            Sign in to access your CRM, tasks, projects, and network — all in one place.
          </p>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-4 bg-surface-container border border-outline/30 rounded-2xl py-4 px-6 font-bold text-sm text-on-surface hover:bg-surface-container-high hover:border-primary/30 transition-all duration-200 active:scale-[0.98] group"
          >
            {/* Google Logo SVG */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="h-px flex-1 bg-outline/20" />
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Secure Login</span>
            <div className="h-px flex-1 bg-outline/20" />
          </div>

          {/* Trust indicators */}
          <div className="space-y-3">
            {[
              'Your data is private — only you can access it',
              'Secured by Supabase Row Level Security',
              'No passwords stored — Google handles identity',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <p className="text-[11px] font-medium text-on-surface-variant">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-on-surface-variant mt-6 font-medium uppercase tracking-widest">
          lexxtech crm • v1.0.0
        </p>
      </div>
    </div>
  );
}
