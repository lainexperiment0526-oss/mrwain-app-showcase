import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { MenuDrawer } from '@/components/MenuDrawer';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useOpenAppModal } from '@/contexts/OpenAppModalContext';
import { PiSignInButton } from '@/components/pi/PiSignInButton';

export function Header() {
  const { setShowOpenAppModal } = useOpenAppModal();

  const handleOpenAppModal = () => {
    setShowOpenAppModal(true);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-xl font-bold text-foreground">OpenApp</span>
        </Link>

        <nav className="flex items-center gap-2">
          <PiSignInButton />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenAppModal}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download App</span>
            <span className="sm:hidden">Download</span>
          </Button>
          <MenuDrawer />
        </nav>
      </div>
    </header>
  );
}
