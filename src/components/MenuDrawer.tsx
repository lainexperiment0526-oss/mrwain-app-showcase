import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useOpenAppModal } from '@/contexts/OpenAppModalContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { AFFILIATE_ENABLED } from '@/config/features';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Menu,
  Home,
  Grid3X3,
  Sun,
  Moon,
  Megaphone,
  BarChart3,
  Shield,
  FileText,
  Scale,
  ShieldCheck,
  Info,
  LogIn,
  LogOut,
  PlusCircle,
  AppWindow,
  User,
  Bookmark,
  MessageSquare,
  Sparkles,
  Trophy,
  Code2,
  Receipt,
  BookOpen,
  Download,
  Coins,
} from 'lucide-react';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

function MenuItem({ icon, label, href, onClick, isActive }: MenuItemProps) {
  const content = (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-secondary text-foreground'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );

  if (href) {
    if (href.startsWith('http')) {
      return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
    }
    return <Link to={href}>{content}</Link>;
  }

  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}

export function MenuDrawer() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const { setShowOpenAppModal } = useOpenAppModal();

  const handleOpenAppModal = () => {
    setShowOpenAppModal(true);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left">{t('common.appName')}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <MenuItem icon={<Home className="h-5 w-5" />} label={t('nav.home')} href="/" />
          <MenuItem icon={<Grid3X3 className="h-5 w-5" />} label={t('nav.browseApps')} href="/" />
          <MenuItem icon={<Sparkles className="h-5 w-5" />} label={t('nav.newApps')} href="/new" />
          <MenuItem icon={<Trophy className="h-5 w-5" />} label={t('nav.topApps')} href="/top" />
          <MenuItem icon={<PlusCircle className="h-5 w-5" />} label={t('nav.submitApp')} href="/submit" />
          {user && <MenuItem icon={<Bookmark className="h-5 w-5" />} label={t('nav.favorites')} href="/bookmarks" />}
          <MenuItem icon={<MessageSquare className="h-5 w-5" />} label={t('nav.feedback')} href="/feedback" />
          <MenuItem icon={<BookOpen className="h-5 w-5" />} label={t('nav.blog')} href="/blog" />
          {user && <MenuItem icon={<Receipt className="h-5 w-5" />} label={t('nav.purchases')} href="/purchases" />}
          {user && <MenuItem icon={<User className="h-5 w-5" />} label={t('nav.profile')} href="/profile" />}
          <MenuItem icon={<Download className="h-5 w-5" />} label={t('nav.downloadApp')} onClick={handleOpenAppModal} />
          {AFFILIATE_ENABLED && (
            <MenuItem icon={<Coins className="h-5 w-5" />} label={t('nav.inviteEarn')} href="/affiliate" />
          )}

          <div className="border-t border-border mt-2 pt-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">{t('nav.developer')}</p>
            <MenuItem icon={<Code2 className="h-5 w-5" />} label={t('nav.developerDashboard')} href="/developer-dashboard" />
            {user && <MenuItem icon={<AppWindow className="h-5 w-5" />} label={t('nav.myApps')} href="/my-apps" />}
            <MenuItem icon={<Coins className="h-5 w-5" />} label={t('nav.testnetReward')} href="/testnet-reward" />
          </div>

          <div className="border-t border-border mt-2 pt-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">{t('nav.adNetwork')}</p>
            <MenuItem icon={<Megaphone className="h-5 w-5" />} label={t('nav.advertiserDashboard')} href="/advertiser" />
            <MenuItem icon={<BarChart3 className="h-5 w-5" />} label={t('nav.analytics')} href="/analytics" />
          </div>

          {isAdmin && (
            <div className="border-t border-border mt-2 pt-3 space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">{t('nav.admin')}</p>
              <MenuItem icon={<Shield className="h-5 w-5" />} label={t('nav.appModeration')} href="/admin" />
              <MenuItem icon={<Shield className="h-5 w-5" />} label={t('nav.adModeration')} href="/ad-moderation" />
              <MenuItem icon={<BookOpen className="h-5 w-5" />} label={t('nav.blogManager')} href="/admin/blog" />
            </div>
          )}

          <div className="border-t border-border mt-2 pt-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">{t('nav.legal')}</p>
            <MenuItem icon={<Info className="h-5 w-5" />} label={t('nav.about')} href="/about" />
            <MenuItem icon={<ShieldCheck className="h-5 w-5" />} label={t('nav.privacy')} href="/privacy" />
            <MenuItem icon={<Scale className="h-5 w-5" />} label={t('nav.terms')} href="/terms" />
            <MenuItem icon={<FileText className="h-5 w-5" />} label={t('nav.license')} href="/license" />
          </div>

          <div className="border-t border-border mt-2 pt-3 space-y-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">{t('language.label')}</p>
            <LanguageSelector variant="full" />
          </div>

          <div className="border-t border-border mt-2 pt-3 space-y-1">
            <MenuItem
              icon={theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
              onClick={toggleTheme}
            />
            {user ? (
              <MenuItem icon={<LogOut className="h-5 w-5" />} label={t('common.signOut')} onClick={signOut} />
            ) : (
              <MenuItem icon={<LogIn className="h-5 w-5" />} label={t('common.signIn')} href="/auth" />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
