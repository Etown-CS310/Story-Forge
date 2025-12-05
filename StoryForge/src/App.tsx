import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-react';
import { Button } from './components/ui/button';
import StoryPlay from './components/ui/storyplay';
import ThemeToggle from './components/ThemeToggle';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-row justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
              <img src="/Story_Forge-logo.png" alt="Story Forge Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-100">Story Forge</span>
          </div>
          <div className="flex items-center gap-4">
            <AuthButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="px-8 py-16">
        <div className="max-w-none mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 pb-2">
              Story Forge
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Craft your narrative, shape your adventure</p>
          </div>

          <Authenticated>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3">
              <TooltipProvider>
                <StoryPlay />
              </TooltipProvider>
            </div>
          </Authenticated>

          <Unauthenticated>
            <div className="max-w-md mx-auto">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-10 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">Welcome Back</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8">
                  Sign in to continue your story and unlock your creative journey
                </p>
                <AuthButton />
              </div>
            </div>
          </Unauthenticated>
        </div>
      </main>
    </div>
  );
}

function AuthButton() {
  const { user, signIn, signOut } = useAuth();

  if (user) {
    return (
      <Button variant="default" size="sm" onClick={() => signOut()}>
        Sign out
      </Button>
    );
  }

  return (
    <Button variant="default" size="sm" onClick={() => void signIn()}>
      Sign in
    </Button>
  );
}
