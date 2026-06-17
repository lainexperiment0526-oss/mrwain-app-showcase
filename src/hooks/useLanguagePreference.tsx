import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getLanguageMeta } from '@/i18n/languages';

/**
 * Syncs the active UI language with the signed-in user's profile.
 *
 * - On sign-in, applies the language saved in the user's profile (if any).
 * - `changeLanguage` updates i18next (which caches to localStorage) and
 *   best-effort persists the choice to the user's profile.
 *
 * Profile persistence is wrapped in try/catch so the UI keeps working even if
 * the `preferred_language` column has not been migrated yet.
 */
export function useLanguagePreference() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const appliedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      appliedForUser.current = null;
      return;
    }
    if (appliedForUser.current === user.id) return;
    appliedForUser.current = user.id;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .maybeSingle();
        const lang = (data as { preferred_language?: string | null } | null)?.preferred_language;
        if (!cancelled && lang && getLanguageMeta(lang) && lang !== i18n.language) {
          i18n.changeLanguage(lang);
        }
      } catch {
        // Column may not exist yet — ignore and keep browser-stored language.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, i18n]);

  const changeLanguage = useCallback(
    async (code: string) => {
      await i18n.changeLanguage(code);
      if (!user) return;
      try {
        await supabase
          .from('profiles')
          .update({ preferred_language: code })
          .eq('id', user.id);
      } catch {
        // Best-effort: persistence to profile is optional.
      }
    },
    [i18n, user],
  );

  return { language: i18n.language, changeLanguage };
}
