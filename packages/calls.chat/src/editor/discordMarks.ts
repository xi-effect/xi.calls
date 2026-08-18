import { markInputRule, markPasteRule } from '@tiptap/core';
import { Bold, starInputRegex, starPasteRegex } from '@tiptap/extension-bold';
import { Underline } from '@tiptap/extension-underline';

/**
 * Discord: `**жирный**`, `__подчёркнутый__`.
 * Стандартный markdown / StarterKit мапит `__` на bold — переназначаем.
 */
const underlineInputRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
const underlinePasteRegex = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))/g;

export const DiscordBold = Bold.extend({
  addInputRules() {
    return [
      markInputRule({
        find: starInputRegex,
        type: this.type,
      }),
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: starPasteRegex,
        type: this.type,
      }),
    ];
  },
});

export const DiscordUnderline = Underline.extend({
  addInputRules() {
    return [
      markInputRule({
        find: underlineInputRegex,
        type: this.type,
      }),
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: underlinePasteRegex,
        type: this.type,
      }),
    ];
  },
});
