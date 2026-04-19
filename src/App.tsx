import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { PiProvider } from "@/hooks/usePiNetwork";
import { SplashScreen } from "@/components/SplashScreen";
import { Footer } from "@/components/Footer";
import { OpenAppModal } from "@/components/OpenAppModal";
import { OpenAppModalProvider, useOpenAppModal } from "@/contexts/OpenAppModalContext";
import { captureRefCodeFromURL, useAffiliate } from "@/hooks/useAffiliate";
import Index from "./pages/Index";
import Affiliate from "./pages/Affiliate";
import AppDetail from "./pages/AppDetail";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import SubmitApp from "./pages/SubmitApp";
import MyApps from "./pages/MyApps";
import AdvertiserDashboard from "./pages/AdvertiserDashboard";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import AdModeration from "./pages/AdModeration";
import Analytics from "./pages/Analytics";
import NewApps from "./pages/NewApps";
import TopApps from "./pages/TopApps";
import Profile from "./pages/Profile";
import AboutOpenApp from "./pages/AboutOpenApp";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import License from "./pages/License";
import Bookmarks from "./pages/Bookmarks";
import Feedback from "./pages/Feedback";
import AppPurchases from "./pages/AppPurchases";
import Blog from "./pages/Blog";
import BlogPostPage from "./pages/BlogPost";
import AdminBlog from "./pages/AdminBlog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { showSplash, setShowSplash, hideSplash, setHideSplash } = useSplashScreen();
  const { showOpenAppModal, setShowOpenAppModal } = useOpenAppModal();
  const { attachPendingRefCode } = useAffiliate();

  useEffect(() => {
    captureRefCodeFromURL();
    const hideTimer = setTimeout(() => setHideSplash(true), 1000);
    const removeTimer = setTimeout(() => setShowSplash(false), 1400);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [setHideSplash, setShowSplash]);

  // Attach pending referral code whenever a user becomes available
  useEffect(() => {
    attachPendingRefCode();
  }, [attachPendingRefCode]);

  return (
    <>
      {showSplash && <SplashScreen isHiding={hideSplash} />}
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/app/:id" element={<AppDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/submit" element={<SubmitApp />} />
          <Route path="/my-apps" element={<MyApps />} />
          <Route path="/advertiser" element={<AdvertiserDashboard />} />
          <Route path="/developer-dashboard" element={<DeveloperDashboard />} />
          <Route path="/ad-moderation" element={<AdModeration />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/new" element={<NewApps />} />
          <Route path="/top" element={<TopApps />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/purchases" element={<AppPurchases />} />
          <Route path="/about" element={<AboutOpenApp />} />
          <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/license" element={<License />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/admin/blog" element={<AdminBlog />} />
            <Route path="/affiliate" element={<Affiliate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
          <OpenAppModal open={showOpenAppModal} onOpenChange={setShowOpenAppModal} />
        </BrowserRouter>
    </>
  );
}

function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [hideSplash, setHideSplash] = useState(false);
  return { showSplash, setShowSplash, hideSplash, setHideSplash };
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <PiProvider>
            <TooltipProvider>
              <OpenAppModalProvider>
                <AppContent />
              </OpenAppModalProvider>
            </TooltipProvider>
          </PiProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
