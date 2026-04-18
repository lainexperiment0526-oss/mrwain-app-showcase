import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '@/hooks/useApps';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { usePiNetwork } from '@/hooks/usePiNetwork';
import { useIsBookmarked, useToggleBookmark } from '@/hooks/useBookmarks';
import { Header } from '@/components/Header';
import { AppIcon } from '@/components/AppIcon';
import { StarRating } from '@/components/StarRating';
import { ReviewSection } from '@/components/ReviewSection';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { RecommendedApps } from '@/components/RecommendedApps';
import { SubscribeServiceList } from '@/components/SubscribeServiceList';
import { SubscriptionServicesManager } from '@/components/SubscriptionServicesManager';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { ArrowLeft, ExternalLink, Share2, ChevronRight, ChevronDown, Bookmark, BookmarkCheck, BookOpen } from 'lucide-react';
import { useBlogPostsByApp } from '@/hooks/useBlog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { AdInterstitial } from '@/components/AdInterstitial';
import { PiAuthModal } from '@/components/PiAuthModal';
import { useOpenPay } from '@/hooks/useOpenPay';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: app, isLoading, error, refetch } = useApp(id || '');
  const { user } = useAuth();
  const { theme } = useTheme();
  const { createPiPayment, isPiReady, authenticateWithPi, isPiAuthenticated } = usePiNetwork();
  const { createOpenPayPayment } = useOpenPay();
  const { data: isBookmarked } = useIsBookmarked(id || '', user?.id);
  const toggleBookmark = useToggleBookmark();
  const { data: blogPosts } = useBlogPostsByApp(id || '');
  const queryClient = useQueryClient();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isOpening, setIsOpening] = useState(false);
  const [showOpenAd, setShowOpenAd] = useState(false);
  const [pendingOpen, setPendingOpen] = useState<{ url: string; appId: string } | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [showPiAuthModal, setShowPiAuthModal] = useState(false);
  const [showPayMethodFor, setShowPayMethodFor] = useState<{ purchaseType: 'onetime' | 'monthly' } | null>(null);

  const normalizeUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    // Keep exact links when a scheme is provided (https, pi, tg, etc).
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (/^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(trimmed)) return `https://${trimmed}`;
    return `https://${trimmed}`;
  }, []);

  const recordDownload = useCallback(async (appId: string, userId: string) => {
    const { error: insertError } = await supabase
      .from('app_downloads')
      .upsert({ app_id: appId, user_id: userId }, { onConflict: 'app_id,user_id', ignoreDuplicates: true });
    if (!insertError) {
      queryClient.invalidateQueries({ queryKey: ['app', appId] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
    }
  }, [queryClient]);

  const handleOpenApp = useCallback(async (url: string, appId: string) => {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      toast.error('No app link available');
      return;
    }

    // If the app is paid, verify entitlement and only charge when needed.
    if (app?.pricing_model === 'paid' && app.price_amount > 0) {
      if (!user) {
        setShowPiAuthModal(true);
        return;
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from('app_purchases')
        .select('id, purchase_type, status, expires_at')
        .eq('user_id', user.id)
        .eq('app_id', appId)
        .maybeSingle();

      if (purchaseError) {
        toast.error('Failed to verify purchase status');
        return;
      }

      const hasOneTimeAccess = purchase?.purchase_type === 'onetime' && purchase?.status === 'active';
      const hasMonthlyAccess = purchase?.purchase_type === 'monthly'
        && purchase?.status === 'active'
        && !!purchase?.expires_at
        && new Date(purchase.expires_at).getTime() > Date.now();
      const hasAccess = hasOneTimeAccess || hasMonthlyAccess;

      if (!hasAccess) {
        if (!app.user_id) {
          toast.error('This app is missing developer payout setup');
          return;
        }
        const purchaseType = app.payment_type === 'monthly' ? 'monthly' : 'onetime';
        // Open payment-method picker; actual payment continues in processPayment()
        setPendingOpen({ url: normalizedUrl, appId });
        setShowPayMethodFor({ purchaseType });
        return;
      }
    }

    setPendingOpen({ url: normalizedUrl, appId });
    setIsOpening(true);
    setShowOpenAd(true);
  }, [normalizeUrl, app, user]);

  const processPayment = useCallback(async (method: 'pi' | 'openpay') => {
    if (!app || !user || !showPayMethodFor) return;
    const { purchaseType } = showPayMethodFor;
    const appId = app.id;
    setShowPayMethodFor(null);
    setIsPaying(true);

    try {
      if (method === 'pi') {
        if (!isPiReady) { toast.error('Pi payment requires Pi Browser'); return; }
        if (!isPiAuthenticated) {
          const piUser = await authenticateWithPi();
          if (!piUser) { toast.error('Pi authentication required'); return; }
        }
        await createPiPayment(
          app.price_amount,
          `${purchaseType === 'monthly' ? 'Subscription payment' : 'Payment'} for ${app.name}`,
          { type: 'app_purchase', app_id: appId, developer_id: app.user_id!, purchase_type: purchaseType },
        );
      } else {
        await createOpenPayPayment(
          app.price_amount,
          `${purchaseType === 'monthly' ? 'Subscription payment' : 'Payment'} for ${app.name}`,
          { type: 'app_purchase', app_id: appId, developer_id: app.user_id!, purchase_type: purchaseType },
        );
      }

      let expiresAt: string | null = null;
      if (purchaseType === 'monthly') {
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        expiresAt = next.toISOString();
      }

      const { error: upsertError } = await supabase
        .from('app_purchases')
        .upsert(
          {
            user_id: user.id,
            app_id: appId,
            purchase_type: purchaseType,
            status: 'active',
            paid_at: new Date().toISOString(),
            expires_at: expiresAt,
          },
          { onConflict: 'user_id,app_id' },
        );

      if (upsertError) throw upsertError;
      queryClient.invalidateQueries({ queryKey: ['app-purchases', user.id] });
      toast.success('Payment successful!');

      // Continue to open
      setIsOpening(true);
      setShowOpenAd(true);
    } catch (err: any) {
      if (err?.message === 'Payment cancelled') toast.info('Payment cancelled');
      else toast.error(err?.message || 'Payment failed');
      setPendingOpen(null);
    } finally {
      setIsPaying(false);
    }
  }, [app, user, showPayMethodFor, isPiReady, isPiAuthenticated, authenticateWithPi, createPiPayment, createOpenPayPayment, queryClient]);

  const handleOpenAfterAd = useCallback(() => {
    const next = pendingOpen;
    setShowOpenAd(false);
    setPendingOpen(null);
    if (!next) {
      setIsOpening(false);
      return;
    }
    if (user?.id) {
      recordDownload(next.appId, user.id).catch(() => {});
    }
    setTimeout(() => setIsOpening(false), 1500);
    // Force full navigation to the exact app link after ad completion.
    window.location.replace(next.url);
  }, [pendingOpen, recordDownload, user?.id]);

  const handleShare = async () => {
    const shareUrl = app?.id ? `${window.location.origin}/app/${app.id}` : window.location.href;
    const shareData = { title: app?.name || 'OpenApp', url: shareUrl };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    } catch {
      try {
        window.prompt('Copy this link', shareUrl);
      } catch {
        toast.error('Unable to share link');
      }
    }
  };

  const handleBookmark = () => {
    if (!user) { setShowPiAuthModal(true); return; }
    toggleBookmark.mutate({ app_id: id!, user_id: user.id, isBookmarked: !!isBookmarked });
  };

  // Record app view on every visit
  useEffect(() => {
    if (id) {
      supabase
        .from('app_views')
        .insert({ app_id: id, user_id: user?.id || null })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['app', id] });
        });
    }
  }, [id, user?.id, queryClient]);

  useEffect(() => {
    if (location.search.includes('refresh=')) {
      refetch();
    }
  }, [location.search, refetch]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6">
          <Skeleton className="h-48 w-full rounded-2xl mb-6" />
          <div className="flex items-start gap-4">
            <Skeleton className="h-24 w-24 rounded-[22%]" />
            <div className="flex-1">
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-10 w-20 rounded-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">App not found</h1>
          <Link to="/" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Apps
          </Link>
        </main>
      </div>
    );
  }

  const sortedScreenshots = app.screenshots?.sort((a, b) => a.display_order - b.display_order) || [];
  const launchMs = app.launch_at ? new Date(app.launch_at).getTime() : null;
  const hasLaunchCountdown = !!launchMs && launchMs > nowMs;
  const countdownMs = hasLaunchCountdown ? launchMs - nowMs : 0;
  const countdownDays = Math.floor(countdownMs / (1000 * 60 * 60 * 24));
  const countdownHours = Math.floor((countdownMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const countdownMinutes = Math.floor((countdownMs % (1000 * 60 * 60)) / (1000 * 60));
  const countdownSeconds = Math.floor((countdownMs % (1000 * 60)) / 1000);
  const appKey = app.name.toLowerCase();
  const badgeMap: Record<string, { light: string; dark: string }> = {
    'openapp': {
      light: 'https://i.ibb.co/BVQYVbyb/verified.png',
      dark: 'https://i.ibb.co/BVQYVbyb/verified.png',
    },
    'flappy pi': {
      light: 'https://i.ibb.co/BVQYVbyb/verified.png',
      dark: 'https://i.ibb.co/BVQYVbyb/verified.png',
    },
    'dropshare': {
      light: 'https://i.ibb.co/BVQYVbyb/verified.png',
      dark: 'https://i.ibb.co/BVQYVbyb/verified.png',
    },
    'drop share': {
      light: 'https://i.ibb.co/BVQYVbyb/verified.png',
      dark: 'https://i.ibb.co/BVQYVbyb/verified.png',
    },
    'droplink': {
      light: 'https://i.ibb.co/BVQYVbyb/verified.png',
      dark: 'https://i.ibb.co/BVQYVbyb/verified.png',
    },
    'mrwain hub': {
      light: 'https://i.ibb.co/p6HtQ2c5/verify-3.png',
      dark: 'https://i.ibb.co/p6HtQ2c5/verify-3.png',
    },
  };
  const badge = badgeMap[appKey];
  const isSubscriptionVerified = !!app.is_verified && !!app.verified_until && new Date(app.verified_until).getTime() > Date.now();
  const isVerified = !!badge || isSubscriptionVerified;
  const badgeSrc = badge ? (theme === 'dark' ? badge.dark : badge.light) : 'https://i.ibb.co/BVQYVbyb/verified.png';

  return (
    <>
    <PiAuthModal open={showPiAuthModal} onOpenChange={setShowPiAuthModal} />
    <div className="min-h-screen bg-background pb-20">
      {showOpenAd && <AdInterstitial trigger="app-open" onComplete={handleOpenAfterAd} />}
      <Header />
      
      <main className="mx-auto max-w-4xl">
        {/* Hero Image / Banner */}
        {sortedScreenshots[0] && (
          <div className="relative h-64 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
            <img src={sortedScreenshots[0].image_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <Link to="/" className="absolute top-4 left-4 h-8 w-8 rounded-full bg-background/50 backdrop-blur flex items-center justify-center">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </Link>
          </div>
        )}

        <div className="px-4">
          {/* App Header */}
          <div className={`flex items-start gap-4 ${sortedScreenshots.length ? '-mt-12 relative z-10' : 'pt-6'}`}>
            <AppIcon src={app.logo_url} name={app.name} size="lg" className="shadow-lg" />
            <div className="flex-1 min-w-0 pt-2">
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                {app.name}
                {isVerified && (
                  <img src={badgeSrc} alt="Verified" className="h-5 w-5" />
                )}
              </h1>
              <p className="text-sm text-muted-foreground">{app.tagline}</p>
              {hasLaunchCountdown && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                  Launches in {countdownDays}d {countdownHours}h {countdownMinutes}m {countdownSeconds}s
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => handleOpenApp(app.website_url, app.id)}
                  disabled={isOpening || isPaying}
                  className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-70"
                >
                  {isPaying ? 'Processing Payment...' : isOpening ? 'Opening...' : app.pricing_model === 'paid' ? `Get - ${app.price_amount} π` : 'Open App'}
                </button>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={handleShare}>
                  <Share2 className="h-5 w-5 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={handleBookmark}>
                  {isBookmarked ? <BookmarkCheck className="h-5 w-5 text-primary fill-primary" /> : <Bookmark className="h-5 w-5 text-primary" />}
                </Button>
                <FeedbackDialog appId={app.id} />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-6 flex items-center justify-around border-y border-border py-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Ratings</p>
              <p className="text-xl font-bold text-foreground">{app.average_rating > 0 ? app.average_rating.toFixed(1) : '--'}</p>
              {app.ratings_count > 0 && <StarRating rating={app.average_rating} size="sm" />}
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Price</p>
              <p className="text-xl font-bold text-foreground">{app.pricing_model === 'paid' ? `${app.price_amount} π` : 'Free'}</p>
              {app.pricing_model === 'paid' && <p className="text-xs text-muted-foreground">{app.payment_type === 'monthly' ? '/month' : 'one-time'}</p>}
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Network</p>
              <p className="text-sm font-medium text-foreground mt-1 capitalize">{app.network_type || 'mainnet'}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Category</p>
              <p className="text-sm font-medium text-foreground mt-1">{app.category?.name || 'App'}</p>
            </div>
          </div>

          {/* Notes */}
          {app.notes && (
            <section className="mt-4 p-3 rounded-xl bg-secondary/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Developer Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{app.notes}</p>
            </section>
          )}

          {/* What's New */}
          {app.whats_new && (
            <section className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-foreground">What's New</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Version {app.version} · {formatDistanceToNow(new Date(app.updated_at), { addSuffix: true })}
              </p>
              <p className="text-foreground whitespace-pre-wrap">{app.whats_new}</p>
            </section>
          )}

          {/* Preview Screenshots */}
          {sortedScreenshots.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Preview</h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
                {sortedScreenshots.map((screenshot, idx) => (
                  <button
                    key={screenshot.id}
                    onClick={() => { setPreviewIndex(idx); setPreviewOpen(true); }}
                    className="flex-shrink-0 w-48 overflow-hidden rounded-2xl bg-card cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <img src={screenshot.image_url} alt="App screenshot" className="w-full h-auto" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <ImagePreviewDialog
            images={sortedScreenshots}
            initialIndex={previewIndex}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
          />

          {/* Description */}
          {app.description && (
            <section className="mt-6">
              <p className={`text-foreground whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                {app.description}
              </p>
              {app.description.length > 150 && (
                <button onClick={() => setShowFullDescription(!showFullDescription)} className="text-primary text-sm font-medium mt-1">
                  {showFullDescription ? 'less' : 'more'}
                </button>
              )}
            </section>
          )}

          {/* Subscription Services (Pi Network subscription model) */}
          <div className="mt-6">
            <SubscribeServiceList appId={app.id} developerId={app.user_id} />
          </div>
          {user && app.user_id === user.id && (
            <div className="mt-6">
              <SubscriptionServicesManager appId={app.id} developerId={user.id} />
            </div>
          )}

          {/* Reviews & Ratings */}
          <ReviewSection appId={app.id} />

          {/* Developer */}
          {app.developer_name && (
            <section className="mt-6 py-4 border-y border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-primary font-medium">{app.developer_name}</p>
                  <p className="text-sm text-muted-foreground">Developer</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </section>
          )}

          {/* Information */}
          <section className="mt-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Information</h2>
            <div className="space-y-4">
              {app.developer_name && <InfoRow label="Provider" value={app.developer_name} />}
              <InfoRow label="Category" value={app.category?.name || 'App'} />
              <InfoRow label="App Views" value={app.views_count?.toLocaleString() || '0'} />
              <InfoRow label="Compatibility" value={app.compatibility} expandable />
              <InfoRow label="Languages" value={app.languages?.join(', ') || 'English'} expandable />
              <InfoRow label="Age Rating" value={app.age_rating} expandable />
              <InfoRow label="In-App Purchases" value={app.has_in_app_purchases ? 'Yes' : 'No'} />
              <InfoRow label="Version" value={app.version} />
              
              {app.developer_website_url && (
                <a href={app.developer_website_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-primary">Developer Website</span>
                  <ExternalLink className="h-4 w-4 text-primary" />
                </a>
              )}
              
              {app.privacy_policy_url && (
                <a href={app.privacy_policy_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-primary">Privacy Policy</span>
                  <ExternalLink className="h-4 w-4 text-primary" />
                </a>
              )}

              {app.terms_of_service_url && (
                <a href={app.terms_of_service_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-primary">Terms of Service</span>
                  <ExternalLink className="h-4 w-4 text-primary" />
                </a>
              )}
            </div>
          </section>

          {/* Blog Posts */}
          {blogPosts && blogPosts.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xl font-bold text-foreground mb-3">Blog</h2>
              <div className="space-y-2">
                {blogPosts.map(post => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="flex items-center gap-3 py-3 border-b border-border hover:bg-secondary/30 rounded-lg px-2 transition-colors"
                  >
                    <BookOpen className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {app.tags && app.tags.length > 0 && (
            <section className="mt-6">
              <div className="flex flex-wrap gap-2">
                {app.tags.map((tag, i) => (
                  <span key={i} className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">{tag}</span>
                ))}
              </div>
            </section>
          )}

          {/* Recommended Apps */}
          <RecommendedApps currentAppId={app.id} categoryId={app.category_id} />
        </div>
      </main>
    </div>
    </>
  );
}

function InfoRow({ label, value, expandable }: { label: string; value: string; expandable?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-foreground">{value}</span>
        {expandable && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  );
}
