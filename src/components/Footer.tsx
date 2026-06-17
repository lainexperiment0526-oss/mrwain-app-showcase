import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
        <span>{t('footer.copyright', { year: 2026 })}</span>
        <div className="flex items-center gap-3">
          <Link to="/about" className="hover:text-foreground transition-colors">{t('footer.about')}</Link>
          <Link to="/blog" className="hover:text-foreground transition-colors">{t('footer.blog')}</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">{t('footer.legal')}</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacy')}</Link>
          <Link to="/license" className="hover:text-foreground transition-colors">{t('footer.license')}</Link>
        </div>
      </div>
    </footer>
  );
}
