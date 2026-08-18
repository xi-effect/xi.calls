import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { BubbleMenu } from '@tiptap/react/menus';
import { useEditorState } from '@tiptap/react';
import { Bold, Italic, Stroke, Underline as UnderlineIcon } from '@xipkg/icons';
import { Button } from '@xipkg/button';
import { cn } from '@xipkg/utils';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

type FormatTypeT = 'bold' | 'italic' | 'underline' | 'strike';

type ChatBubbleMenuProps = {
  editor: Editor;
};

const isValidTextSelection = (state: EditorState): boolean => {
  const { doc, selection } = state;
  if (!(selection instanceof TextSelection) || selection.empty) return false;
  if (selection.from === 0 || selection.to === 0) return false;

  try {
    const $from = doc.resolve(selection.from);
    const $to = doc.resolve(selection.to);
    return $from.parent.isTextblock && $to.parent.isTextblock;
  } catch {
    return false;
  }
};

type FormatButtonProps = {
  editor: Editor;
  type: FormatTypeT;
  isActive: boolean;
  ariaLabel: string;
  children: ReactNode;
};

const FormatButton = ({ editor, type, isActive, ariaLabel, children }: FormatButtonProps) => {
  return (
    <Button
      type="button"
      variant="none"
      aria-label={ariaLabel}
      aria-pressed={isActive}
      className={cn(
        '[&_svg]:fill-icon-primary h-6 w-6 rounded-sm p-1',
        isActive && 'bg-status-info-background [&_svg]:fill-icon-brand',
      )}
      onMouseDown={(event) => {
        event.preventDefault();
        editor.chain().focus().toggleMark(type).run();
      }}
    >
      {children}
    </Button>
  );
};

export const ChatBubbleMenu = ({ editor }: ChatBubbleMenuProps) => {
  const { t } = useTranslation('calls');
  const activeStates = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      appendTo={() => editor.view.dom.ownerDocument.body}
      shouldShow={({ state }) => isValidTextSelection(state)}
      options={{
        placement: 'top',
        strategy: 'fixed',
        offset: 8,
      }}
      className="border-border-default bg-background-surface z-200 flex gap-1 rounded-lg border p-1 shadow-lg"
    >
      <FormatButton
        editor={editor}
        type="bold"
        isActive={activeStates.bold}
        ariaLabel={t('chat.formatBold')}
      >
        <Bold />
      </FormatButton>
      <FormatButton
        editor={editor}
        type="italic"
        isActive={activeStates.italic}
        ariaLabel={t('chat.formatItalic')}
      >
        <Italic />
      </FormatButton>
      <FormatButton
        editor={editor}
        type="underline"
        isActive={activeStates.underline}
        ariaLabel={t('chat.formatUnderline')}
      >
        <UnderlineIcon />
      </FormatButton>
      <FormatButton
        editor={editor}
        type="strike"
        isActive={activeStates.strike}
        ariaLabel={t('chat.formatStrike')}
      >
        <Stroke />
      </FormatButton>
    </BubbleMenu>
  );
};
