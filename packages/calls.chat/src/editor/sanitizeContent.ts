import type { JSONContent } from '@tiptap/core';

const ALLOWED_NODES = new Set(['doc', 'paragraph', 'text', 'hardBreak', 'codeBlock', 'blockquote']);

const ALLOWED_MARKS = new Set(['bold', 'italic', 'strike', 'underline', 'code', 'link']);

const MAX_NODES = 400;
const MAX_TEXT = 8000;
const MAX_DEPTH = 16;
const MAX_HREF_LENGTH = 2000;

const isSafeHref = (href: unknown): href is string => {
  if (typeof href !== 'string' || href.length === 0 || href.length > MAX_HREF_LENGTH) {
    return false;
  }

  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const sanitizeChatContent = (input: unknown): JSONContent | undefined => {
  if (!input || typeof input !== 'object') return undefined;

  let nodeCount = 0;
  let textLength = 0;

  const walk = (node: unknown, depth: number): JSONContent | null => {
    if (nodeCount > MAX_NODES || textLength > MAX_TEXT || depth > MAX_DEPTH) return null;
    if (!node || typeof node !== 'object') return null;

    const raw = node as JSONContent;
    if (typeof raw.type !== 'string' || !ALLOWED_NODES.has(raw.type)) return null;

    nodeCount += 1;
    const result: JSONContent = { type: raw.type };

    if (raw.type === 'text') {
      if (typeof raw.text !== 'string') return null;
      textLength += raw.text.length;
      result.text = raw.text;
    }

    if (raw.type === 'codeBlock' && raw.attrs && typeof raw.attrs.language === 'string') {
      result.attrs = { language: raw.attrs.language.slice(0, 32) };
    }

    if (Array.isArray(raw.marks) && raw.marks.length > 0) {
      const marks: NonNullable<JSONContent['marks']> = [];

      for (const mark of raw.marks) {
        if (!mark || typeof mark !== 'object' || typeof mark.type !== 'string') continue;
        if (!ALLOWED_MARKS.has(mark.type)) continue;

        if (mark.type === 'link') {
          const href = mark.attrs?.href;
          if (!isSafeHref(href)) continue;
          marks.push({
            type: 'link',
            attrs: { href, target: '_blank', rel: 'noopener noreferrer' },
          });
          continue;
        }

        marks.push({ type: mark.type });
      }

      if (marks.length > 0) result.marks = marks;
    }

    if (Array.isArray(raw.content)) {
      const content: JSONContent[] = [];
      for (const child of raw.content) {
        const sanitized = walk(child, depth + 1);
        if (sanitized) content.push(sanitized);
      }
      if (content.length > 0) result.content = content;
    }

    return result;
  };

  const sanitized = walk(input, 0);
  if (!sanitized || sanitized.type !== 'doc') return undefined;
  return sanitized;
};
