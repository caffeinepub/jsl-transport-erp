import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import Layout from "./components/Layout";
import SetupProfileModal from "./components/SetupProfileModal";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetUserProfile } from "./hooks/useQueries";
import LoginPage from "./pages/LoginPage";

type Page =
  | "dashboard"
  | "billing"
  | "diesel"
  | "pettycash"
  | "payments"
  | "tds"
  | "reports"
  | "settings"
  | "consigners"
  | "consignees"
  | "delivery_orders"
  | "vehicles"
  | "loading_trips"
  | "unloading";

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const {
    data: userProfile,
    isLoading: profileLoading,
    isSuccess: profileLoaded,
  } = useGetUserProfile();

  // Block rendering only while the query is in-flight for the first time (no data yet)
  if (profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Connecting to Jeen Trade ERP...
          </p>
          <p className="text-xs text-muted-foreground opacity-60">
            This may take a few seconds on first login
          </p>
        </div>
      </div>
    );
  }

  // Query has completed — check if profile exists
  if (profileLoaded && !userProfile) {
    return <SetupProfileModal />;
  }

  if (!userProfile) {
    // Fallback: query not ready yet
    return <SetupProfileModal />;
  }

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={(page) => setCurrentPage(page as Page)}
      userProfile={userProfile}
    />
  );
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Connecting to Internet Computer...
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This may take a few seconds on first login
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      {identity ? <AuthenticatedApp /> : <LoginPage />}
    </>
  );
}
