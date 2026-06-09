import { useMedia } from './useMedia';

/** Только телефон: планшеты и iPad используют десктопный compact-вид. */
export function usePhoneLayout(): boolean {
  return useMedia('(max-width: 720px)');
}
