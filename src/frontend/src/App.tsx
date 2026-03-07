import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";
import SetupProfileModal from "./components/SetupProfileModal";
import { useActor } from "./hooks/useActor";
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
  | "unloading"
  | "receivable"
  | "payable"
  | "pettycash_ledger"
  | "petrol_bunks";

function AuthenticatedApp() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const { actor } = useActor();

  // Timeout: after 8 seconds stop blocking on actor init
  const [actorTimedOut, setActorTimedOut] = useState(false);
  useEffect(() => {
    if (actor) return;
    const t = setTimeout(() => setActorTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [actor]);

  const { data: userProfile, isLoading: profileLoading } = useGetUserProfile();

  // If profile query has been loading for more than 15s total, stop waiting
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  useEffect(() => {
    if (!profileLoading) return;
    const t = setTimeout(() => setProfileTimedOut(true), 15000);
    return () => clearTimeout(t);
  }, [profileLoading]);

  const waitingForActor = !actor && !actorTimedOut;
  const waitingForProfile = actor && profileLoading && !profileTimedOut;

  if (waitingForActor || waitingForProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden shadow-md bg-white">
            <img
              src="/assets/uploads/ChatGPT-Image-Mar-7-2026-02_18_24-PM-1.png"
              alt="JTPL Logo"
              className="h-14 w-14 object-contain"
            />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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

  // Profile not set up yet (or actor/profile timed out but no profile cached)
  if (!userProfile) {
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
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden shadow-md bg-white">
            <img
              src="/assets/uploads/ChatGPT-Image-Mar-7-2026-02_18_24-PM-1.png"
              alt="JTPL Logo"
              className="h-14 w-14 object-contain"
            />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
