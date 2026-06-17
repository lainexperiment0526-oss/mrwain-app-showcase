import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LANGUAGES, getLanguageMeta } from '@/i18n/languages';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';

interface LanguageSelectorProps {
  /** Compact icon-only trigger (header) vs. full-width row (mobile menu). */
  variant?: 'icon' | 'full';
}

export function LanguageSelector({ variant = 'icon' }: LanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const { changeLanguage } = useLanguagePreference();
  const current = getLanguageMeta(i18n.language);

  const trigger =
    variant === 'icon' ? (
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label={t('language.select')}
        title={t('language.select')}
      >
        <Globe className="h-5 w-5" />
      </Button>
    ) : (
      <button className="w-full text-left">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-secondary text-foreground">
          <Globe className="h-5 w-5" />
          <span className="font-medium flex-1">{t('language.label')}</span>
          <span className="text-sm text-muted-foreground">{current?.nativeName}</span>
        </div>
      </button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
        <DropdownMenuLabel>{t('language.select')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = current?.code === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex flex-col">
                <span className="font-medium">{lang.nativeName}</span>
                {lang.nativeName !== lang.name && (
                  <span className="text-xs text-muted-foreground">{lang.name}</span>
                )}
              </span>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
