import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const LOGO_SRC = "/assets/uploads/ChatGPT-Image-Mar-7-2026-02_18_24-PM-1.png";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useSaveUserProfile } from "../hooks/useQueries";

const ROLES = [
  "Super Admin",
  "Director",
  "Operations Manager",
  "Accounts",
  "Diesel Manager",
  "Data Entry",
  "Auditor",
];

export default function SetupProfileModal() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Super Admin");
  const [isSaving, setIsSaving] = useState(false);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const saveProfile = useSaveUserProfile();
  const { actor } = useActor();
  const pendingNameRef = useRef<string | null>(null);
  const pendingRoleRef = useRef<string>("Super Admin");
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current)
        clearTimeout(connectionTimeoutRef.current);
    };
  }, []);

  // When actor becomes available, process any pending queued save
  useEffect(() => {
    if (actor && pendingNameRef.current !== null) {
      // Clear the connection timeout since actor is now ready
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setConnectionTimedOut(false);
      const nameToSave = pendingNameRef.current;
      const roleToSave = pendingRoleRef.current;
      pendingNameRef.current = null;
      void (async () => {
        try {
          await saveProfile.mutateAsync({ name: nameToSave });
          localStorage.setItem("jt_user_role", roleToSave);
          toast.success("Profile created successfully!");
        } catch (err) {
          console.error("Profile save failed (deferred):", err);
          toast.error("Failed to save profile. Please refresh and try again.");
          setIsSaving(false);
        }
      })();
    }
  }, [actor, saveProfile]);

  const handleReset = () => {
    pendingNameRef.current = null;
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    setIsSaving(false);
    setConnectionTimedOut(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    setConnectionTimedOut(false);

    if (actor) {
      let lastError: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await saveProfile.mutateAsync({ name: trimmedName });
          localStorage.setItem("jt_user_role", role);
          toast.success("Profile created successfully!");
          return;
        } catch (err) {
          lastError = err;
          if (attempt < 3) {
            await new Promise((res) => setTimeout(res, 800 * attempt));
          }
        }
      }
      console.error("Profile save failed after 3 attempts:", lastError);
      toast.error(
        "Failed to save profile. Please refresh the page and try again.",
      );
      setIsSaving(false);
      return;
    }

    // Actor not ready yet -- queue the save and start a timeout
    pendingNameRef.current = trimmedName;
    pendingRoleRef.current = role;
    toast.info(
      "Connecting to network, your profile will be saved automatically...",
    );

    // If actor still hasn't connected after 20 seconds, unlock the button
    connectionTimeoutRef.current = setTimeout(() => {
      if (pendingNameRef.current !== null) {
        // Actor never arrived -- allow user to retry
        pendingNameRef.current = null;
        setIsSaving(false);
        setConnectionTimedOut(true);
      }
    }, 20000);
  };

  const isSubmitting = isSaving || saveProfile.isPending;

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl overflow-hidden shadow-md"
            style={{
              background: "#ffffff",
              border: "1px solid oklch(0.88 0.01 240)",
            }}
          >
            <img
              src={LOGO_SRC}
              alt="JTPL Logo"
              className="h-18 w-18 object-contain p-1"
            />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold font-display text-foreground">
              Welcome to Jeen Trade ERP
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up your profile to get started
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              data-ocid="profile.input"
            />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select
              value={role}
              onValueChange={setRole}
              disabled={isSubmitting}
            >
              <SelectTrigger data-ocid="profile.role.select">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !name.trim()}
            data-ocid="profile.submit_button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {actor ? "Saving..." : "Connecting & Saving..."}
              </>
            ) : (
              "Continue to Dashboard"
            )}
          </Button>
          {isSubmitting && !actor && (
            <p
              className="text-center text-xs text-muted-foreground"
              data-ocid="profile.loading_state"
            >
              Establishing secure connection, please wait...
            </p>
          )}
          {connectionTimedOut && (
            <div
              className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center"
              data-ocid="profile.error_state"
            >
              <p className="text-xs text-orange-700 font-medium mb-2">
                Network connection is taking too long. Please try again.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-orange-700 underline hover:text-orange-900"
                data-ocid="profile.retry_button"
              >
                Click here to retry
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
