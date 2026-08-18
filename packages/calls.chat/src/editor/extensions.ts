import StarterKit from '@tiptap/starter-kit';
import { DiscordBold, DiscordUnderline } from './discordMarks';

const LINK_CLASS = 'text-text-link hover:text-text-link cursor-pointer underline';

/** Схема чата: Discord-шорткаты + тот же набор марок, что у текста на доске. */
export const chatExtensions = [
  StarterKit.configure({
    bold: false,
    underline: false,
    heading: false,
    horizontalRule: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    trailingNode: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
        class: LINK_CLASS,
      },
    },
  }),
  DiscordBold,
  DiscordUnderline,
];
