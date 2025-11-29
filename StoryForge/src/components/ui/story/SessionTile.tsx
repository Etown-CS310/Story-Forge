import React from 'react';
import { Button } from '@/components/ui/button';
import { Id } from '@/../convex/_generated/dataModel';
import SessionView from './SessionView';

export default function SessionTile({ session }: { session: any }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 dark:text-white truncate">{session.title ?? 'Session'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Story • {session.storyTitle}</div>
        </div>
        <Button
          variant={open ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="flex-shrink-0"
        >
          {open ? 'Close' : 'Open'}
        </Button>
      </div>
      {open && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <SessionView
            sessionId={session._id as Id<'sessions'>}
            closeActiveSession={function (): void {
              throw new Error('Function not implemented.');
            }}
          />
        </div>
      )}
    </div>
  );
}
