import type { JSONContent } from '@tiptap/core';
import type { ReactNode } from 'react';

const LINK_CLASS = 'text-text-link hover:text-text-link cursor-pointer underline';

const wrapMarks = (text: string, marks: JSONContent['marks']): ReactNode => {
  return (marks ?? []).reduce<ReactNode>((acc, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong className="font-bold">{acc}</strong>;
      case 'italic':
        return <em className="pr-[0.18em] italic">{acc}</em>;
      case 'strike':
        return <s>{acc}</s>;
      case 'underline':
        return <u>{acc}</u>;
      case 'code':
        return (
          <code className="bg-background-page rounded px-1 py-0.5 font-mono text-[0.85em]">
            {acc}
          </code>
        );
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : undefined;
        if (!href) return acc;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
            onClick={(event) => event.stopPropagation()}
            data-umami-event="outbound-link-click"
            data-umami-event-url={href}
            data-umami-event-source="chat"
          >
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, text);
};

const renderNode = (node: JSONContent, key: string): ReactNode => {
  const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`));

  switch (node.type) {
    case 'doc':
      return children;
    case 'paragraph':
      return (
        <p key={key} className="m-0 min-h-[1em]">
          {children ?? <br />}
        </p>
      );
    case 'blockquote':
      return (
        <blockquote
          key={key}
          className="border-border-default text-text-secondary my-1 border-l-2 pl-2"
        >
          {children}
        </blockquote>
      );
    case 'codeBlock':
      return (
        <pre
          key={key}
          className="bg-background-page my-1 overflow-x-auto rounded-lg p-2 font-mono text-xs whitespace-pre-wrap"
        >
          <code>{children}</code>
        </pre>
      );
    case 'hardBreak':
      return <br key={key} />;
    case 'text':
      return <span key={key}>{wrapMarks(node.text ?? '', node.marks)}</span>;
    default:
      return children;
  }
};

export const renderChatJsonContent = (content: JSONContent): ReactNode => {
  return renderNode(content, 'chat-doc');
};
