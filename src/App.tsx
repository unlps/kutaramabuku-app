import { NotificationProvider } from "@/context/NotificationContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthorRouteGuard } from "@/components/auth/AuthorRouteGuard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Account from "./pages/Account";
import Auth from "./pages/Auth";
import BookDetails from "./pages/BookDetails";
import CompleteProfile from "./pages/CompleteProfile";
import CreateEbook from "./pages/CreateEbook";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import Editor from "./pages/Editor";
import EditProfile from "./pages/EditProfile";
import Index from "./pages/Index";
import MyBooks from "./pages/MyBooks";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ReviewerAuth from "./pages/reviewer/ReviewerAuth";
import ReviewerBookDetail from "./pages/reviewer/ReviewerBookDetail";
import ReviewerDashboard from "./pages/reviewer/ReviewerDashboard";
import ReviewerInvite from "./pages/reviewer/ReviewerInvite";
import ReviewerInviteAdmin from "./pages/reviewer/ReviewerInviteAdmin";
import ReviewerProfile from "./pages/reviewer/ReviewerProfile";
import ReviewerQueue from "./pages/reviewer/ReviewerQueue";

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
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/complete_profile" element={<CompleteProfile />} />
              <Route
                path="/edit-profile"
                element={
                  <AuthorRouteGuard>
                    <EditProfile />
                  </AuthorRouteGuard>
                }
              />
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

              <Route path="/reviewer/auth" element={<ReviewerAuth />} />
              <Route path="/reviewer/invite" element={<ReviewerInvite />} />
              <Route path="/reviewer/dashboard" element={<ReviewerDashboard />} />
              <Route path="/reviewer/queue" element={<ReviewerQueue />} />
              <Route path="/reviewer/book/:id" element={<ReviewerBookDetail />} />
              <Route path="/reviewer/profile" element={<ReviewerProfile />} />
              <Route path="/reviewer/admin/invites" element={<ReviewerInviteAdmin />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
