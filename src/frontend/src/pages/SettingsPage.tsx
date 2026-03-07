import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type ERPSettings,
  useGetSettings,
  useSaveSettings,
} from "../hooks/useQueries";

const ROLES = [
  "Super Admin",
  "Director",
  "Operations Manager",
  "Accounts",
  "Diesel Manager",
  "Data Entry",
  "Auditor",
];

export default function SettingsPage() {
  const settingsQuery = useGetSettings();
  const saveSettings = useSaveSettings();

  const [form, setForm] = useState<ERPSettings>({
    companyName: "Jeen Trade & Exports Pvt Ltd",
    companyAddress: "",
    companyGST: "",
    gpsDeduction: 131,
    challanRate: 200,
    shortageRate: 5000,
    gstRate: 18,
  });

  const [userRole] = useState(
    () => localStorage.getItem("jt_user_role") ?? "Super Admin",
  );

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSettings.mutateAsync(form);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings.");
    }
  };

  return (
    <div className="p-6 space-y-6" data-ocid="settings.page">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "oklch(0.55 0.18 240 / 0.12)" }}
        >
          <Settings
            className="h-4 w-4"
            style={{ color: "oklch(0.55 0.18 240)" }}
          />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display text-foreground">
            Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure your ERP preferences
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {/* Company Details */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold font-display">
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company-name" className="text-xs">
                Company Name
              </Label>
              <Input
                id="company-name"
                value={form.companyName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, companyName: e.target.value }))
                }
                className="text-xs"
                data-ocid="settings.company_name.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-address" className="text-xs">
                Address
              </Label>
              <Input
                id="company-address"
                placeholder="Company address"
                value={form.companyAddress}
                onChange={(e) =>
                  setForm((p) => ({ ...p, companyAddress: e.target.value }))
                }
                className="text-xs"
                data-ocid="settings.company_address.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-gst" className="text-xs">
                GST Number
              </Label>
              <Input
                id="company-gst"
                placeholder="21ABCDE1234F1Z5"
                value={form.companyGST}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    companyGST: e.target.value.toUpperCase(),
                  }))
                }
                className="text-xs uppercase"
                data-ocid="settings.company_gst.input"
              />
            </div>
          </CardContent>
        </Card>

        {/* ERP Configuration */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold font-display">
              ERP Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gps-ded" className="text-xs">
                GPS Deduction (₹/trip)
              </Label>
              <Input
                id="gps-ded"
                type="number"
                min="0"
                step="1"
                value={form.gpsDeduction}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    gpsDeduction: Number(e.target.value),
                  }))
                }
                className="text-xs"
                data-ocid="settings.gps_deduction.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="challan-rate" className="text-xs">
                Challan Rate (₹)
              </Label>
              <Input
                id="challan-rate"
                type="number"
                min="0"
                step="50"
                value={form.challanRate}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    challanRate: Number(e.target.value),
                  }))
                }
                className="text-xs"
                data-ocid="settings.challan_rate.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shortage-rate" className="text-xs">
                Shortage Rate (₹/MT)
              </Label>
              <Input
                id="shortage-rate"
                type="number"
                min="0"
                step="100"
                value={form.shortageRate}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    shortageRate: Number(e.target.value),
                  }))
                }
                className="text-xs"
                data-ocid="settings.shortage_rate.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gst-rate" className="text-xs">
                GST Rate (%)
              </Label>
              <Input
                id="gst-rate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.gstRate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gstRate: Number(e.target.value) }))
                }
                className="text-xs"
                data-ocid="settings.gst_rate.input"
              />
            </div>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold font-display">
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Current Role
                </p>
                <p className="text-sm font-semibold mt-0.5">{userRole}</p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                style={{
                  background: "oklch(0.72 0.18 60 / 0.15)",
                  color: "oklch(0.72 0.18 60)",
                }}
              >
                {(userRole || "A").charAt(0).toUpperCase()}
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Roles available: {ROLES.join(", ")}
            </p>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={saveSettings.isPending}
          data-ocid="settings.submit_button"
        >
          {saveSettings.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </form>
    </div>
  );
}
