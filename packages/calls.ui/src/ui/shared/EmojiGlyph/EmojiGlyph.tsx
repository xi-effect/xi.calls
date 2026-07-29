import { useMemo } from 'react';
import { EmojiDecorator } from '@astronautlabs/emoji';
import { cn } from '@xipkg/utils';

// Версия зафиксирована под установленную в package.json, чтобы обновление CDN-ассетов
// не могло неожиданно сломать вёрстку/разметку картинок при мажорном апдейте библиотеки.
const EMOJI_PACKAGE_VERSION = '17.1.0';
export const EMOJI_CDN_BASE_URL = `https://cdn.jsdelivr.net/npm/@astronautlabs/emoji@${EMOJI_PACKAGE_VERSION}/assets/`;

type EmojiGlyphPropsT = {
  /** Юникод-символ эмодзи, например '👍' */
  emoji: string;
  className?: string;
  'aria-label'?: string;
};

/**
 * Рендерит единообразную (одинаковую на всех ОС/браузерах) картинку эмодзи через
 * @astronautlabs/emoji: используем строковый API (EmojiDecorator.parseString), который
 * возвращает готовую разметку с <img>. Важно НЕ использовать DOM-вариант parse(element, ...) —
 * в текущей версии библиотеки он падает с "Failed to construct 'HTMLImageElement': Illegal
 * constructor" (внутри вызывается `new HTMLImageElement()` вместо document.createElement).
 */
export const EmojiGlyph = ({ emoji, className, 'aria-label': ariaLabel }: EmojiGlyphPropsT) => {
  const html = useMemo(() => EmojiDecorator.parse(emoji, { baseUrl: EMOJI_CDN_BASE_URL }), [emoji]);

  return (
    <span
      role="img"
      aria-label={ariaLabel ?? emoji}
      className={cn(
        'emoji-glyph inline-flex shrink-0 items-center justify-center leading-none [&_img.emoji]:h-full [&_img.emoji]:w-full [&_img.emoji]:object-contain',
        className,
      )}
      // html собирается самой библиотекой из фиксированного эмодзи-символа, не из пользовательского ввода
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
