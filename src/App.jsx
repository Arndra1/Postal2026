import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCw } from 'lucide-react';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import AdminGuard from '@/components/AdminGuard';
import Landing from '@/pages/Landing';
import ResponsibleDataUse from '@/pages/ResponsibleDataUse';
import TermsOfUse from '@/pages/TermsOfUse';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import FindLeads from '@/pages/FindLeads';
import FindLeadsUnified from '@/pages/FindLeadsUnified';
import NeedOrientedSearch from '@/pages/NeedOrientedSearch';
import BankruptcyFinder from '@/pages/BankruptcyFinder';
import Enrich from '@/pages/Enrich';
import SavedLeads from '@/pages/SavedLeads';
import Pipeline from '@/pages/Pipeline';
import Credits from '@/pages/Credits';
import Billing from '@/pages/Billing';
import Account from '@/pages/Account';
import Help from '@/pages/Help';
import OutreachTemplates from '@/pages/OutreachTemplates';
import AddLead from '@/pages/AddLead';
import Notifications from '@/pages/Notifications';
import FederalGrants from '@/pages/FederalGrants';
import SavedSearches from '@/pages/SavedSearches';
import ThankYou from '@/pages/ThankYou';
import AdminOverview from '@/pages/admin/AdminOverview';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminSubscriptions from '@/pages/admin/AdminSubscriptions';
import AdminCredits from '@/pages/admin/AdminCredits';
import AdminEnrichments from '@/pages/admin/AdminEnrichments';
import AdminBilling from '@/pages/admin/AdminBilling';
import AdminActivity from '@/pages/admin/AdminActivity';
import AdminCompliance from '@/pages/admin/AdminCompliance';
import NewBusinessFinder from '@/pages/NewBusinessFinder';
import AdminDataSources from '@/pages/admin/AdminDataSources';
import AdminSupport from '@/pages/admin/AdminSupport';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, retryAuth } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    } else if (authError.type === 'server_error') {
      // Server/network error — show retry screen, don't redirect to login
      return (
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-heading font-semibold">Connection issue</h2>
            <p className="text-muted-foreground text-sm">{authError.message || "We couldn't reach the server. This is usually temporary."}</p>
            <Button onClick={retryAuth} className="h-11">
              <RotateCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </div>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/responsible-data-use" element={<ResponsibleDataUse />} />
      <Route path="/terms" element={<TermsOfUse />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/ThankYou" element={<ThankYou />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/find-leads" element={<FindLeads />} />
          <Route path="/find-leads-unified" element={<FindLeadsUnified />} />
          <Route path="/discover" element={<NeedOrientedSearch />} />
          <Route path="/bankruptcy" element={<BankruptcyFinder />} />
          <Route path="/new-businesses" element={<NewBusinessFinder />} />
          <Route path="/enrich" element={<Enrich />} />
          <Route path="/saved-leads" element={<SavedLeads />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/account" element={<Account />} />
          <Route path="/help" element={<Help />} />
          <Route path="/outreach" element={<OutreachTemplates />} />
          <Route path="/add-lead" element={<AddLead />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/federal-grants" element={<FederalGrants />} />
          <Route path="/saved-searches" element={<SavedSearches />} />
          <Route path="/admin/overview" element={<AdminGuard><AdminOverview /></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
          <Route path="/admin/subscriptions" element={<AdminGuard><AdminSubscriptions /></AdminGuard>} />
          <Route path="/admin/credits" element={<AdminGuard><AdminCredits /></AdminGuard>} />
          <Route path="/admin/enrichments" element={<AdminGuard><AdminEnrichments /></AdminGuard>} />
          <Route path="/admin/billing" element={<AdminGuard><AdminBilling /></AdminGuard>} />
          <Route path="/admin/activity" element={<AdminGuard><AdminActivity /></AdminGuard>} />
          <Route path="/admin/compliance" element={<AdminGuard><AdminCompliance /></AdminGuard>} />
          <Route path="/admin/data-sources" element={<AdminGuard><AdminDataSources /></AdminGuard>} />
          <Route path="/admin/support" element={<AdminGuard><AdminSupport /></AdminGuard>} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App