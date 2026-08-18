import { useCallback, useEffect, useRef } from 'react';
import type { Editor, JSONContent } from '@tiptap/core';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { Button } from '@xipkg/button';
import { Send } from '@xipkg/icons';
import { cn } from '@xipkg/utils';
import { chatExtensions } from '../editor/extensions';
import { chatProseClassName } from '../editor/proseClassName';
import { ChatBubbleMenu } from './ChatBubbleMenu';

type ChatComposerProps = {
  placeholder: string;
  onSend: (text: string, content: JSONContent) => void;
};

export const ChatComposer = ({ placeholder, onSend }: ChatComposerProps) => {
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;

  const editorRef = useRef<Editor | null>(null);

  const sendFromEditor = useCallback(() => {
    const current = editorRef.current;
    if (!current || current.isDestroyed) return;

    const text = current.getText({ blockSeparator: '\n' }).trim();
    if (!text) return;

    onSendRef.current(text, current.getJSON());
    current.commands.clearContent(true);
    current.commands.focus();
  }, []);

  const sendFromEditorRef = useRef(sendFromEditor);
  sendFromEditorRef.current = sendFromEditor;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: chatExtensions,
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'min-h-6 text-sm break-words outline-none',
        'aria-label': placeholder,
      },
      handleKeyDown: (_view, event) => {
        if (
          event.key !== 'Enter' ||
          event.shiftKey ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        ) {
          return false;
        }
        if (event.isComposing || event.keyCode === 229) return false;

        event.preventDefault();
        sendFromEditorRef.current();
        return true;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const isEmpty =
    useEditorState({
      editor,
      selector: ({ editor: current }) => !current?.getText({ blockSeparator: '\n' }).trim(),
    }) ?? true;

  return (
    <div className="flex shrink-0 items-end gap-2 pr-3">
      <div
        className={cn(
          'border-border-default flex max-h-40 w-full flex-1 items-center rounded-xl border pl-4',
          chatProseClassName,
        )}
      >
        <div className="relative min-w-0 flex-1">
          {isEmpty && (
            <span className="text-text-secondary pointer-events-none absolute top-3 left-0 text-sm">
              {placeholder}
            </span>
          )}
          <EditorContent editor={editor} className="my-3 max-h-32 overflow-y-auto pr-2" />
          {editor && <ChatBubbleMenu editor={editor} />}
        </div>
        <div className="pr-1">
          <Button
            size="icon"
            variant="primary"
            onClick={sendFromEditor}
            disabled={isEmpty}
            className="rounded-xl p-2"
          >
            <Send
              className={cn(
                'fill-action-primary-text group-hover:fill-action-primary-text h-6 w-6',
                isEmpty && 'fill-icon-secondary',
              )}
            />
          </Button>
        </div>
      </div>
    </div>
  );
};
