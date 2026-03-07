import { Button } from "@/components/ui/button";
import { BarChart3, FileText, Loader2, Shield, Truck } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const LOGO_SRC = "/assets/uploads/ChatGPT-Image-Mar-7-2026-02_18_24-PM-1.png";

export default function LoginPage() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "oklch(0.18 0.04 260)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden"
            style={{ background: "#ffffff" }}
          >
            <img
              src={LOGO_SRC}
              alt="JTPL Logo"
              className="h-11 w-11 object-contain"
            />
          </div>
          <div>
            <span
              className="block text-xl font-bold font-display leading-tight"
              style={{ color: "oklch(0.95 0.01 240)" }}
            >
              Jeen Trade &amp; Exports
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.72 0.18 60)" }}
            >
              Pvt Ltd — Transport ERP
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1
              className="text-4xl font-bold font-display leading-tight"
              style={{ color: "oklch(0.95 0.01 240)" }}
            >
              Complete ERP for Your Transport Business
            </h1>
            <p
              className="mt-4 text-base leading-relaxed"
              style={{ color: "oklch(0.65 0.02 240)" }}
            >
              Manage trips, billing, diesel expenses, petty cash, payments and
              TDS all in one professional system.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: Truck,
                label: "Trip Management",
                desc: "Track every trip with auto calculations",
              },
              {
                icon: FileText,
                label: "GST Billing",
                desc: "Generate invoices with automatic GST",
              },
              {
                icon: BarChart3,
                label: "Reports & Analytics",
                desc: "Real-time charts and summaries",
              },
              {
                icon: Shield,
                label: "Secure & Reliable",
                desc: "Blockchain-powered data storage",
              },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-lg p-4"
                style={{ background: "oklch(0.25 0.04 260)" }}
              >
                <Icon
                  className="h-5 w-5 mb-2"
                  style={{ color: "oklch(0.72 0.18 60)" }}
                />
                <p
                  className="text-sm font-semibold font-display"
                  style={{ color: "oklch(0.9 0.01 240)" }}
                >
                  {label}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(0.6 0.02 240)" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity"
            style={{ color: "oklch(0.55 0.02 240)" }}
          >
            caffeine.ai
          </a>
        </p>
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
