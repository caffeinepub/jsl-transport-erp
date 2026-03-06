import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useSaveUserProfile } from "../hooks/useQueries";

export default function SetupProfileModal() {
  const [name, setName] = useState("");
  const saveProfile = useSaveUserProfile();
  const { actor } = useActor();

  // Actor is present when this modal renders — isReady is simply whether the actor exists.
  const isReady = !!actor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!actor) {
      toast.error(
        "Still connecting to the network. Please wait a moment and try again.",
      );
      return;
    }

    // Retry up to 3 times to handle transient network issues
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await saveProfile.mutateAsync({ name: name.trim() });
        toast.success("Profile created successfully!");
        return;
      } catch (err) {
        lastError = err;
        if (attempt < 3) {
          await new Promise((res) => setTimeout(res, 1000 * attempt));
        }
      }
    }

    console.error("Profile save failed after 3 attempts:", lastError);
    toast.error(
      "Failed to save profile. Please refresh the page and try again.",
    );
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold font-display text-foreground">
              Complete Your Profile
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your name to get started with Jeen Trade ERP
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-ocid="profile.input"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={saveProfile.isPending || !name.trim() || !isReady}
            data-ocid="profile.submit_button"
          >
            {saveProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : !isReady ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Continue to Dashboard"
            )}
          </Button>
          {!isReady && (
            <p
              className="text-center text-xs text-muted-foreground"
              data-ocid="profile.loading_state"
            >
              Establishing secure connection...
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
