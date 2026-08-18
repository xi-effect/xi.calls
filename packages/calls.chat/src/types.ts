import type { JSONContent } from '@tiptap/core';

export type ChatMessageT = {
  id: string;
  text: string;
  /** TipTap JSON. Старые клиенты поле игнорируют и показывают `text`. */
  content?: JSONContent;
  senderId: string;
  senderName: string;
  timestamp: number;
};
