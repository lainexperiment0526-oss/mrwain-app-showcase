import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { PiProvider } from "@/hooks/usePiNetwork";
import { PiAuthProvider } from "@/contexts/PiAuthContext";
import { SplashScreen } from "@/components/SplashScreen";
import { Footer } from "@/components/Footer";
import { OpenAppModal } from "@/components/OpenAppModal";
import { OpenAppModalProvider, useOpenAppModal } from "@/contexts/OpenAppModalContext";
import { captureRefCodeFromURL, useAffiliate } from "@/hooks/useAffiliate";
import { RequireAuth } from "@/components/RequireAuth";
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
import TestnetRewardPage from "./pages/TestnetRewardPage";
import TestnetProgressPage from "./pages/admin/TestnetProgressPage";
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
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/about" element={<AboutOpenApp />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/license" element={<License />} />
          <Route path="/testnet-reward" element={<TestnetRewardPage />} />
          <Route path="/admin/testnet-progress" element={<RequireAuth><TestnetProgressPage /></RequireAuth>} />


          {/* Protected routes — sign-in required */}
          <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
          <Route path="/app/:id" element={<RequireAuth><AppDetail /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
          <Route path="/submit" element={<RequireAuth><SubmitApp /></RequireAuth>} />
          <Route path="/my-apps" element={<RequireAuth><MyApps /></RequireAuth>} />
          <Route path="/advertiser" element={<RequireAuth><AdvertiserDashboard /></RequireAuth>} />
          <Route path="/developer-dashboard" element={<RequireAuth><DeveloperDashboard /></RequireAuth>} />
          <Route path="/ad-moderation" element={<RequireAuth><AdModeration /></RequireAuth>} />
          <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
          <Route path="/new" element={<RequireAuth><NewApps /></RequireAuth>} />
          <Route path="/top" element={<RequireAuth><TopApps /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/bookmarks" element={<RequireAuth><Bookmarks /></RequireAuth>} />
          <Route path="/feedback" element={<RequireAuth><Feedback /></RequireAuth>} />
          <Route path="/purchases" element={<RequireAuth><AppPurchases /></RequireAuth>} />
          <Route path="/blog" element={<RequireAuth><Blog /></RequireAuth>} />
          <Route path="/blog/:slug" element={<RequireAuth><BlogPostPage /></RequireAuth>} />
          <Route path="/admin/blog" element={<RequireAuth><AdminBlog /></RequireAuth>} />
          <Route path="/affiliate" element={<RequireAuth><Affiliate /></RequireAuth>} />
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
            <PiAuthProvider>
              <TooltipProvider>
                <OpenAppModalProvider>
                  <AppContent />
                </OpenAppModalProvider>
              </TooltipProvider>
            </PiAuthProvider>
          </PiProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
