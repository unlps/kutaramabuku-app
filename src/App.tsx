import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CompleteProfile from "./pages/CompleteProfile";
import Dashboard from "./pages/Dashboard";
import CreateEbook from "./pages/CreateEbook";
import Editor from "./pages/Editor";
import Discover from "./pages/Discover";
import Notifications from "./pages/Notifications";
import Account from "./pages/Account";
import MyBooks from "./pages/MyBooks";
import BookDetails from "./pages/BookDetails";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";

// ValidaMabuku — Reviewer Dashboard Pages
import ReviewerAuth from "./pages/reviewer/ReviewerAuth";
import ReviewerInvite from "./pages/reviewer/ReviewerInvite";
import ReviewerDashboard from "./pages/reviewer/ReviewerDashboard";
import ReviewerQueue from "./pages/reviewer/ReviewerQueue";
import ReviewerBookDetail from "./pages/reviewer/ReviewerBookDetail";
import ReviewerProfile from "./pages/reviewer/ReviewerProfile";
import ReviewerInviteAdmin from "./pages/reviewer/ReviewerInviteAdmin";
import { AuthorRouteGuard } from "./components/auth/AuthorRouteGuard";

const queryClient = new QueryClient();

const RootRedirect = () => {
  const hostname = window.location.hostname;
  if (hostname.includes("validamabuku") || import.meta.env.VITE_IS_REVIEWER_APP === "true") {
    return <Navigate to="/reviewer/auth" replace />;
  }
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route
              path="/dashboard"
              element={
                <AuthorRouteGuard>
                  <Dashboard />
                </AuthorRouteGuard>
              }
            />
            <Route
              path="/create"
              element={
                <AuthorRouteGuard>
                  <CreateEbook />
                </AuthorRouteGuard>
              }
            />
            <Route
              path="/editor"
              element={
                <AuthorRouteGuard>
                  <Editor />
                </AuthorRouteGuard>
              }
            />
            <Route
              path="/discover"
              element={
                <AuthorRouteGuard>
                  <Discover />
                </AuthorRouteGuard>
              }
            />
            <Route
              path="/notifications"
              element={
                <AuthorRouteGuard>
                  <Notifications />
                </AuthorRouteGuard>
              }
            />
            <Route
              path="/account"
              element={
                <AuthorRouteGuard>
                  <Account />
                </AuthorRouteGuard>
              }
            />
            <Route
              path="/account/:userId"
              element={
                <AuthorRouteGuard>
                  <Account />
                </AuthorRouteGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <AuthorRouteGuard>
                  <Settings />
                </AuthorRouteGuard>
              }
            />
            <Route
              path="/my-books"
              element={
                <AuthorRouteGuard>
                  <MyBooks />
                </AuthorRouteGuard>
              }
            />
            <Route
              path="/book/:id"
              element={
                <AuthorRouteGuard>
                  <BookDetails />
                </AuthorRouteGuard>
              }
            />

            {/* ValidaMabuku — Reviewer Dashboard */}
            <Route path="/reviewer/auth" element={<ReviewerAuth />} />
            <Route path="/reviewer/invite" element={<ReviewerInvite />} />
            <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
            <Route path="/reviewer/queue" element={<ReviewerQueue />} />
            <Route path="/reviewer/book/:id" element={<ReviewerBookDetail />} />
            <Route path="/reviewer/profile" element={<ReviewerProfile />} />
            <Route path="/reviewer/admin/invites" element={<ReviewerInviteAdmin />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
