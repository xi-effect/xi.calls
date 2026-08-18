import { cn } from '@xipkg/utils';

/**
 * Жирный — 700, не 600: при синтезе начертания (нет файла Inter Bold) 600 почти неотличим от 400.
 */
const chatInlineMarksClassName = cn(
  '[&_strong]:font-bold',
  '[&_em]:italic',
  '[&_s]:line-through',
  '[&_u]:underline',
);

/** Общие стили ProseMirror для композера и пузырьков сообщений. */
export const chatProseClassName = cn(
  '[&_.ProseMirror]:min-h-6 [&_.ProseMirror]:text-sm [&_.ProseMirror]:break-words [&_.ProseMirror]:outline-none',
  '[&_.ProseMirror_p]:m-0 [&_.ProseMirror_p+p]:mt-1',
  '[&_.ProseMirror_strong]:font-bold',
  '[&_.ProseMirror_em]:italic',
  '[&_.ProseMirror_s]:line-through',
  '[&_.ProseMirror_u]:underline',
  '[&_.ProseMirror_code]:bg-background-page [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-[0.85em]',
  '[&_.ProseMirror_pre]:bg-background-page [&_.ProseMirror_pre]:my-1 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:p-2 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-xs [&_.ProseMirror_pre]:whitespace-pre-wrap',
  '[&_.ProseMirror_blockquote]:border-border-default [&_.ProseMirror_blockquote]:text-text-secondary [&_.ProseMirror_blockquote]:my-1 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:pl-2',
  '[&_.ProseMirror_a]:text-text-link [&_.ProseMirror_a]:cursor-pointer [&_.ProseMirror_a]:underline',
);

export const chatMessageProseClassName = cn(
  'text-sm wrap-break-word',
  '[&_p]:m-0 [&_p+p]:mt-1',
  chatInlineMarksClassName,
);
