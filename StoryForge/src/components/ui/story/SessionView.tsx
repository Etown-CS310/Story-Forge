import React, { useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Id } from '@/../convex/_generated/dataModel';
import { api } from '@/../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play } from 'lucide-react';

export default function SessionView({
  sessionId,
  closeActiveSession,
}: {
  sessionId: Id<'sessions'>;
  closeActiveSession: (id: Id<'sessions'> | null) => void;
}) {
  const data = useQuery(api.ui.getSessionState, { sessionId });
  const choose = useMutation(api.ui.chooseEdge);
  const advance = useMutation(api.ui.advanceSession);

  // Auto-play: repeatedly advance the session by picking the first available choice
  const [autoPlay, setAutoPlay] = React.useState(false);
  React.useEffect(() => {
    if (!autoPlay) return;
    let cancelled = false;

    const step = async () => {
      try {
        const res = await advance({ sessionId });
        // if server returned null, there are no more choices
        if (!res || cancelled) {
          setAutoPlay(false);
          return;
        }
        // wait a bit then continue; session state will re-sync via Convex
        if (!cancelled)
          setTimeout(() => {
            void step();
          }, 1200);
      } catch (e) {
        console.error('Auto-play failed', e);
        setAutoPlay(false);
      }
    };

    // kick off first step
    setTimeout(() => {
      void step();
    }, 600);

    return () => {
      cancelled = true;
    };
  }, [autoPlay, advance, sessionId]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-md">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Chat</CardTitle>
            <Button onClick={() => closeActiveSession(null)}>Close session</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ScrollArea className="h-80 rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900">
            <MessageList messages={data.messages} />
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <CardTitle className="text-lg">Choices</CardTitle>
          <div>
            <Button
              size="sm"
              variant={autoPlay ? 'secondary' : 'outline'}
              onClick={() => setAutoPlay((v) => !v)}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              {autoPlay ? 'Stop' : 'Auto'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {data.choices.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              No choices at this step.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {data.choices.map((c) => (
                <Button
                  key={c._id}
                  variant="secondary"
                  textLocation="left"
                  onClick={() => {
                    void choose({ sessionId, edgeId: c._id });
                  }}
                  className="hover:bg-blue-100 dark:hover:bg-blue-900 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left"
                >
                  {c.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MessageList({ messages }: { messages: any[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <>
          {m.edgeContent && <MessageBubble key={m._id + '-edge'} role="user" content={m.edgeContent} />}
          <MessageBubble key={m._id} role={m.role} author={m.author} content={m.content} />
        </>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ role, author, content }: { role: string; author?: string; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700'
        }`}
      >
        <div
          className={`text-[10px] mb-1.5 font-medium ${isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}
        >
          {author ?? role}
        </div>
        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{content}</div>
      </div>
    </div>
  );
}
