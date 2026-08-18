import type { JSONContent } from '@tiptap/core';
import { cn } from '@xipkg/utils';
import { renderChatJsonContent } from '../editor/renderJsonContent';
import { chatMessageProseClassName } from '../editor/proseClassName';
import { parseLinks } from '../utils/chat';

type ChatMessageContentProps = {
  text: string;
  content?: JSONContent;
  className?: string;
};

export const ChatMessageContent = ({ text, content, className }: ChatMessageContentProps) => {
  return (
    <div className={cn(chatMessageProseClassName, className)}>
      {content ? renderChatJsonContent(content) : parseLinks(text)}
    </div>
  );
};
