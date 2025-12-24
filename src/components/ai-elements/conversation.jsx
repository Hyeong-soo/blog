'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowDownIcon } from 'lucide-react';
import { useCallback } from 'react';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';

export const Conversation = ({ className, children, ...props }) => (
  <StickToBottom
    className={cn(
      'relative flex flex-col flex-1 overflow-hidden w-full',
      className
    )}
    style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  >
    {children}
  </StickToBottom>
);

export const ConversationContent = ({ className, ...props }) => (
  <StickToBottom.Content
    className={cn('flex flex-col gap-8 p-4', className)}
    {...props}
  />
);

export const ConversationEmptyState = ({
  className,
  title = 'No messages yet',
  description = 'Start a conversation to see messages here',
  icon,
  children,
  ...props
}) => (
  <div
    className={cn(
      'flex size-full flex-col items-center justify-center gap-3 p-8 text-center',
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export const ConversationScrollButton = ({ className, ...props }) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  if (isAtBottom) return null;

  return (
    <Button
      className={cn(
        'absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full shadow-md',
        className
      )}
      onClick={handleScrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
};
