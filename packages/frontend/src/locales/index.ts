import en, { type TranslationKey } from './en';
import cs from './cs';

export type Locale = 'en' | 'cs';
export type { TranslationKey };

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  en,
  cs: cs as Record<TranslationKey, string>,
};
