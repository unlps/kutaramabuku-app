import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateEbook />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/:userId" element={<Account />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-books" element={<MyBooks />} />
            <Route path="/book/:id" element={<BookDetails />} />

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
