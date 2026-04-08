import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Loader2 } from "lucide-react";

const LOGO_SRC = "/assets/uploads/ChatGPT-Image-Mar-7-2026-02_18_24-PM-1.png";
const TRUCK_IMG_SRC =
  "/assets/uploads/ChatGPT-Image-Mar-7-2026-08_27_43-PM-1.png";

export default function LoginPage() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Truck Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src={TRUCK_IMG_SRC}
          alt="JTPL Transport"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Subtle overlay for branding text */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.45) 100%)",
          }}
        />
        {/* Brand overlay at bottom */}
        <div className="absolute bottom-8 left-8 right-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-white shadow">
              <img
                src={LOGO_SRC}
                alt="JTPL Logo"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div>
              <span className="block text-lg font-bold text-white drop-shadow">
                Jeen Trade &amp; Exports
              </span>
              <span className="text-xs font-medium text-yellow-300 drop-shadow">
                Pvt Ltd — Transport ERP
              </span>
            </div>
          </div>
          <p className="text-xs text-white/70">
            © {new Date().getFullYear()}. Built with{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80 transition-opacity"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl overflow-hidden shadow-md"
              style={{
                background: "#ffffff",
                border: "1px solid oklch(0.9 0.01 240)",
              }}
            >
              <img
                src={LOGO_SRC}
                alt="JTPL Logo"
                className="h-18 w-18 object-contain p-1"
              />
            </div>
            <div className="text-center">
              <span className="block text-xl font-bold font-display text-foreground">
                Jeen Trade &amp; Exports
              </span>
              <span className="text-xs text-muted-foreground">
                Pvt Ltd — Transport ERP
              </span>
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold font-display text-foreground">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to access the ERP system
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={login}
              disabled={isLoggingIn}
              className="w-full h-11 text-sm font-semibold"
              data-ocid="login.primary_button"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Sign in with Internet Identity"
              )}
            </Button>

            {isLoginError && (
              <div
                className="rounded-md p-3 text-sm"
                style={{
                  background: "oklch(0.577 0.245 27.325 / 0.1)",
                  color: "oklch(0.45 0.2 27)",
                  border: "1px solid oklch(0.577 0.245 27.325 / 0.3)",
                }}
                data-ocid="login.error_state"
              >
                {loginError?.message || "Login failed. Please try again."}
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Secure authentication powered by the Internet Computer
          </p>
        </div>
      </div>
    </div>
  );
}
