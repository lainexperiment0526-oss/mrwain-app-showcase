import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, Smartphone, CheckCircle2, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAffiliate } from '@/hooks/useAffiliate';

interface OpenAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenAppModal({ open, onOpenChange }: OpenAppModalProps) {
  const { user } = useAuth();
  const { profile, confirmApkInstalled } = useAffiliate();
  const [confirming, setConfirming] = useState(false);

  const apkLink = 'https://median.co/share/nmdkwkr#apk';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(apkLink)}`;

  const handleDownloadAPK = () => {
    window.open(apkLink, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(apkLink);
      toast.success('Download link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleConfirmInstalled = async () => {
    setConfirming(true);
    const err = await confirmApkInstalled();
    setConfirming(false);
    if (err) toast.error(err.message);
    else {
      toast.success(profile?.referred_by ? 'Confirmed! Your referrer earned $1.' : 'Install confirmed.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">OpenApp</DialogTitle>
          <DialogDescription className="text-center">
            Download the OpenApp mobile application for Android devices
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* QR Code Section */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-48 h-48 bg-white rounded-lg p-2 shadow-sm">
              <img 
                src={qrCodeUrl} 
                alt="OpenApp Download QR Code" 
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Scan the QR code to launch the page on your Android device, then download and install the APK
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleDownloadAPK}
              className="w-full flex items-center gap-2"
              size="lg"
            >
              <Download className="h-5 w-5" />
              Download Android APK
            </Button>
            
            <Button 
              onClick={handleCopyLink}
              variant="outline"
              className="w-full flex items-center gap-2"
              size="lg"
            >
              <Copy className="h-5 w-5" />
              Copy download link to clipboard
            </Button>
          </div>

          {/* iOS Coming Soon Section */}
          <div className="rounded-xl border border-border bg-secondary/30 p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Coming Soon iOS</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              OpenApp for iOS devices is currently under development. Stay tuned for updates!
            </p>
          </div>

          {/* Documentation Link */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              After downloading, open the APK and accept all prompts. 
              <a 
                href="#" 
                className="text-primary hover:underline ml-1"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info('Documentation coming soon!');
                }}
              >
                documentation
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
