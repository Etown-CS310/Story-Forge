import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { StoryRow } from '@/components/ui/story';
import { Id } from '@/../convex/_generated/dataModel';

interface StoryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;

  title: string;
  stories?: any[];
  enableSearch?: boolean;
  onSearch?: (q: string) => void;

  onEdit: (id: Id<'stories'>) => void;
  onStart: (sessionId: Id<'sessions'>) => void;

  children?: React.ReactNode; // For custom content like NewStoryCard
}

export function StoryDialog({
  open,
  onOpenChange,
  title,
  stories,
  enableSearch = false,
  onSearch,
  onEdit,
  onStart,
  children,
}: StoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-black dark:text-white">{title}</DialogTitle>
        </DialogHeader>

        {/* Optional search bar */}
        {enableSearch && (
          <div className="relative my-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search..." className="pl-10" onChange={(e) => onSearch?.(e.target.value)} />
          </div>
        )}

        {/* Custom content (e.g., NewStoryCard) */}
        {children}

        {/* Story list */}
        {stories && (
          <div className="space-y-3 mt-4">
            {stories.map((s) => (
              <StoryRow
                key={s._id}
                story={s}
                onEdit={(id) => {
                  onEdit(id);
                  onOpenChange(false);
                }}
                onStart={(sessionId) => {
                  onStart(sessionId);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default StoryDialog;
