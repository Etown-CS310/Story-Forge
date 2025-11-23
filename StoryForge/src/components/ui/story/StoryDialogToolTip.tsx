import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface StoryDialogTooltipProps {
  label: string;
  children: React.ReactNode;
}

export function StoryDialogTooltip({ label, children }: StoryDialogTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default StoryDialogTooltip;
