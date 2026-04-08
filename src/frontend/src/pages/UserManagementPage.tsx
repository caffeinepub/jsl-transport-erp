import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ActivityLogEntry } from "../utils/activityLog";
import { logActivity } from "../utils/activityLog";

/* ------------------------------------------------------------------ */
/*  Interfaces                                                          */
/* ------------------------------------------------------------------ */

export interface UserRegistration {
  id: string;
  displayName: string;
  principalId: string;
  role: "Admin" | "User";
  firstLogin: string;
  lastLogin: string;
  status: "Active" | "Inactive";
}

export interface LoginHistoryEntry {
  id: string;
  loginTime: string;
  logoutTime?: string;
  userName: string;
  principalId: string;
  status: "Active" | "Expired" | "Logged Out";
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function getRegistry(): UserRegistration[] {
  return JSON.parse(localStorage.getItem("jt_user_registry") || "[]");
}

function saveRegistry(reg: UserRegistration[]) {
  localStorage.setItem("jt_user_registry", JSON.stringify(reg));
}

function getLoginHistory(): LoginHistoryEntry[] {
  return JSON.parse(localStorage.getItem("jt_login_history") || "[]");
}

function saveLoginHistory(h: LoginHistoryEntry[]) {
  localStorage.setItem("jt_login_history", JSON.stringify(h));
}

function fmt(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncatePrincipal(p: string) {
  if (!p || p.length <= 16) return p;
  return `${p.slice(0, 8)}…${p.slice(-6)}`;
}

function calcDuration(login: string, logout?: string): string {
  const start = new Date(login).getTime();
  const end = logout ? new Date(logout).getTime() : Date.now();
  const diff = Math.floor((end - start) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

const MODULES = [
  "All Modules",
  "Dashboard",
  "Delivery Orders",
  "Loading Trips",
  "Unloading",
  "Billing",
  "Receivable",
  "Payable",
  "Diesel",
  "Petty Cash",
  "Cash & Bank",
  "TDS",
  "Fleet",
  "Consigners",
  "Consignees",
  "Petrol Bunks",
  "Settings",
  "User Management",
];

const ACTIONS = [
  "All",
  "Created",
  "Updated",
  "Deleted",
  "Viewed",
  "Login",
  "Logout",
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-rose-100 bg-white shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-5 py-3 border-b border-rose-100"
        style={{ background: "oklch(0.97 0.015 350)" }}
      >
        <Icon
          className="h-4 w-4 shrink-0"
          style={{ color: "oklch(0.45 0.18 350)" }}
        />
        <h2
          className="text-sm font-semibold"
          style={{ color: "oklch(0.25 0.1 350)" }}
        >
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function UserManagementPage() {
  const { identity } = useInternetIdentity();
  const principalId = identity?.getPrincipal().toText() ?? "Unknown Principal";

  const profile = useMemo(
    () =>
      JSON.parse(localStorage.getItem("jt_user_profile") || "{}") as {
        displayName?: string;
        id?: string;
      },
    [],
  );
  const displayName = profile.displayName || "Unknown User";
  const userRole = (localStorage.getItem("jt_user_role") ?? "User") as
    | "Admin"
    | "User";
  const isAdmin = userRole === "Admin";

  const [registry, setRegistry] = useState<UserRegistration[]>(() =>
    getRegistry(),
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);

  /* ---------- filters (activity log) --------- */
  const [filterUser, setFilterUser] = useState("All");
  const [filterModule, setFilterModule] = useState("All Modules");
  const [filterAction, setFilterAction] = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [logPage, setLogPage] = useState(1);
  const LOG_PAGE_SIZE = 50;

  /* ---------- bootstrap on mount ------------- */
  useEffect(() => {
    // Auto-register current user
    const reg = getRegistry();
    const existing = reg.find((u) => u.principalId === principalId);
    const now = new Date().toISOString();
    if (!existing) {
      const newUser: UserRegistration = {
        id: Date.now().toString(),
        displayName,
        principalId,
        role: reg.length === 0 ? "Admin" : "User", // first user becomes Admin
        firstLogin: now,
        lastLogin: now,
        status: "Active",
      };
      reg.unshift(newUser);
      saveRegistry(reg);
    } else {
      existing.lastLogin = now;
      existing.displayName = displayName;
      saveRegistry(reg);
    }
    setRegistry(getRegistry());

    // Auto-log login session
    const hist = getLoginHistory();
    const sessionKey = "jt_current_session";
    let sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = Date.now().toString();
      sessionStorage.setItem(sessionKey, sessionId);
      const entry: LoginHistoryEntry = {
        id: sessionId,
        loginTime: now,
        userName: displayName,
        principalId,
        status: "Active",
      };
      hist.unshift(entry);
      saveLoginHistory(hist.slice(0, 100));
    }
    setLoginHistory(getLoginHistory().slice(0, 20));

    // Load activity log
    setActivityLogs(
      JSON.parse(localStorage.getItem("jt_activity_log") || "[]"),
    );

    // Log this page view
    logActivity("Viewed", "User Management", "Viewed User Management page");
  }, [principalId, displayName]);

  /* ---------- role toggle ------------------- */
  function toggleRole() {
    const next = userRole === "Admin" ? "User" : "Admin";
    localStorage.setItem("jt_user_role", next);
    // Update registry too
    const reg = getRegistry();
    const me = reg.find((u) => u.principalId === principalId);
    if (me) {
      me.role = next;
      saveRegistry(reg);
      setRegistry(getRegistry());
    }
    logActivity("Updated", "User Management", `Switched own role to ${next}`);
    toast.success(`Role switched to ${next}`);
    // force re-render parent via page reload
    setTimeout(() => window.location.reload(), 600);
  }

  /* ---------- admin: change user role ------- */
  function changeUserRole(userId: string, newRole: "Admin" | "User") {
    if (!isAdmin) return;
    const reg = getRegistry();
    const user = reg.find((u) => u.id === userId);
    if (!user) return;
    const oldRole = user.role;
    user.role = newRole;
    saveRegistry(reg);
    setRegistry(getRegistry());
    logActivity(
      "Updated",
      "User Management",
      `Changed role of ${user.displayName} from ${oldRole} to ${newRole}`,
    );
    toast.success(`Role updated for ${user.displayName}`);
  }

  /* ---------- admin: toggle user status ----- */
  function toggleUserStatus(userId: string) {
    if (!isAdmin) return;
    const reg = getRegistry();
    const user = reg.find((u) => u.id === userId);
    if (!user) return;
    user.status = user.status === "Active" ? "Inactive" : "Active";
    saveRegistry(reg);
    setRegistry(getRegistry());
    logActivity(
      "Updated",
      "User Management",
      `Set ${user.displayName} status to ${user.status}`,
    );
    toast.success(
      `User ${user.status === "Active" ? "activated" : "deactivated"}`,
    );
  }

  /* ---------- activity log filters ---------- */
  const userNames = useMemo(() => {
    const names = new Set<string>();
    for (const l of activityLogs) names.add(l.userName);
    return ["All", ...Array.from(names)];
  }, [activityLogs]);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((l) => {
      if (filterUser !== "All" && l.userName !== filterUser) return false;
      if (filterModule !== "All Modules" && l.module !== filterModule)
        return false;
      if (filterAction !== "All" && l.action !== filterAction) return false;
      if (filterDateFrom && l.timestamp < `${filterDateFrom}T00:00:00`)
        return false;
      if (filterDateTo && l.timestamp > `${filterDateTo}T23:59:59`)
        return false;
      return true;
    });
  }, [
    activityLogs,
    filterUser,
    filterModule,
    filterAction,
    filterDateFrom,
    filterDateTo,
  ]);

  const logTotalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / LOG_PAGE_SIZE),
  );
  const pagedLogs = filteredLogs.slice(
    (logPage - 1) * LOG_PAGE_SIZE,
    logPage * LOG_PAGE_SIZE,
  );

  /* ---------------------------------------------------------------- */

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div
        className="rounded-xl px-6 py-4 text-white"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.22 0.08 350), oklch(0.35 0.14 350))",
        }}
      >
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 opacity-80" />
          <div>
            <h1 className="text-lg font-bold font-display">User Management</h1>
            <p className="text-xs opacity-70">
              Manage users, roles, activity logs and login history
            </p>
          </div>
        </div>
      </div>

      {/* ---- Section 1: Current User ---- */}
      <SectionCard icon={Shield} title="Current User">
        <div
          className="rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ background: "oklch(0.96 0.02 350)" }}
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ background: "oklch(0.45 0.18 350)" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Display Name
              </p>
              <p className="text-sm font-semibold text-foreground">
                {displayName}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Current Role
              </p>
              <Badge
                className="mt-0.5 text-xs"
                style={
                  userRole === "Admin"
                    ? {
                        background: "oklch(0.92 0.12 142)",
                        color: "oklch(0.3 0.14 142)",
                        border: "none",
                      }
                    : {
                        background: "oklch(0.92 0.1 240)",
                        color: "oklch(0.3 0.15 240)",
                        border: "none",
                      }
                }
              >
                {userRole}
              </Badge>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Principal ID
              </p>
              <p
                className="text-xs font-mono break-all text-foreground"
                title={principalId}
              >
                {principalId}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={toggleRole}
            className="shrink-0 text-white text-xs"
            style={{ background: "oklch(0.72 0.18 60)", border: "none" }}
            data-ocid="user-mgmt.toggle_role_button"
          >
            Switch to {userRole === "Admin" ? "User" : "Admin"}
          </Button>
        </div>
      </SectionCard>

      {/* ---- Section 2: User Registry ---- */}
      <SectionCard icon={Users} title="User Registry">
        <p className="text-xs text-muted-foreground mb-3">
          User registry tracks who has accessed this application. Users
          auto-register on first login.
        </p>
        <div className="overflow-x-auto rounded-lg border border-rose-100">
          <Table>
            <TableHeader>
              <TableRow style={{ background: "oklch(0.95 0.02 350)" }}>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Display Name
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Principal ID
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Role
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  First Login
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Last Login
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Status
                </TableHead>
                {isAdmin && (
                  <TableHead
                    className="text-xs font-semibold"
                    style={{ color: "oklch(0.3 0.1 350)" }}
                  >
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {registry.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No users registered yet
                  </TableCell>
                </TableRow>
              )}
              {registry.map((u) => (
                <TableRow
                  key={u.id}
                  className={
                    u.principalId === principalId ? "bg-rose-50/40" : ""
                  }
                  data-ocid={`user-registry.row.${u.id}`}
                >
                  <TableCell className="text-sm font-medium">
                    {u.displayName}
                    {u.principalId === principalId && (
                      <span className="ml-1.5 text-[10px] text-rose-500 font-semibold">
                        (You)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-xs font-mono cursor-default"
                      title={u.principalId}
                    >
                      {truncatePrincipal(u.principalId)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {isAdmin && u.principalId !== principalId ? (
                      <Select
                        value={u.role}
                        onValueChange={(v) =>
                          changeUserRole(u.id, v as "Admin" | "User")
                        }
                      >
                        <SelectTrigger
                          className="h-7 w-24 text-xs bg-white text-foreground border-rose-200"
                          data-ocid={`user-registry.role_select.${u.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="User">User</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        className="text-xs"
                        style={
                          u.role === "Admin"
                            ? {
                                background: "oklch(0.92 0.12 142)",
                                color: "oklch(0.3 0.14 142)",
                                border: "none",
                              }
                            : {
                                background: "oklch(0.92 0.1 240)",
                                color: "oklch(0.3 0.15 240)",
                                border: "none",
                              }
                        }
                      >
                        {u.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmt(u.firstLogin)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmt(u.lastLogin)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="text-xs"
                      style={
                        u.status === "Active"
                          ? {
                              background: "oklch(0.92 0.12 142)",
                              color: "oklch(0.3 0.14 142)",
                              border: "none",
                            }
                          : {
                              background: "oklch(0.9 0 0)",
                              color: "oklch(0.45 0 0)",
                              border: "none",
                            }
                      }
                    >
                      {u.status}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {u.principalId !== principalId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => toggleUserStatus(u.id)}
                          data-ocid={`user-registry.status_toggle.${u.id}`}
                        >
                          {u.status === "Active" ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* ---- Section 3: Activity Log ---- */}
      <SectionCard icon={Activity} title="Activity Log">
        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger
              className="h-8 text-xs bg-white text-foreground border-rose-200"
              data-ocid="activity-log.filter_user"
            >
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              {userNames.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger
              className="h-8 text-xs bg-white text-foreground border-rose-200"
              data-ocid="activity-log.filter_module"
            >
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              {MODULES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger
              className="h-8 text-xs bg-white text-foreground border-rose-200"
              data-ocid="activity-log.filter_action"
            >
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => {
              setFilterDateFrom(e.target.value);
              setLogPage(1);
            }}
            className="h-8 rounded-md border border-rose-200 bg-white px-2 text-xs text-foreground"
            placeholder="From date"
            data-ocid="activity-log.filter_date_from"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value);
              setLogPage(1);
            }}
            className="h-8 rounded-md border border-rose-200 bg-white px-2 text-xs text-foreground"
            placeholder="To date"
            data-ocid="activity-log.filter_date_to"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-rose-100">
          <Table>
            <TableHeader>
              <TableRow style={{ background: "oklch(0.95 0.02 350)" }}>
                <TableHead
                  className="text-xs font-semibold whitespace-nowrap"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Timestamp
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  User
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Action
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Module
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLogs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground py-8"
                    data-ocid="activity-log.empty_state"
                  >
                    No activity logs match the current filters
                  </TableCell>
                </TableRow>
              )}
              {pagedLogs.map((log) => (
                <TableRow key={log.id} data-ocid={`activity-log.row.${log.id}`}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmt(log.timestamp)}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {log.userName}
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.module}
                  </TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground max-w-xs truncate"
                    title={log.details}
                  >
                    {log.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {logTotalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              Showing {(logPage - 1) * LOG_PAGE_SIZE + 1}–
              {Math.min(logPage * LOG_PAGE_SIZE, filteredLogs.length)} of{" "}
              {filteredLogs.length} entries
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                disabled={logPage === 1}
                data-ocid="activity-log.prev_page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {logPage} / {logTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() =>
                  setLogPage((p) => Math.min(logTotalPages, p + 1))
                }
                disabled={logPage === logTotalPages}
                data-ocid="activity-log.next_page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ---- Section 4: Login History ---- */}
      <SectionCard icon={Clock} title="Login History">
        <div className="overflow-x-auto rounded-lg border border-rose-100">
          <Table>
            <TableHeader>
              <TableRow style={{ background: "oklch(0.95 0.02 350)" }}>
                <TableHead
                  className="text-xs font-semibold whitespace-nowrap"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Login Time
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  User
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Principal ID
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Duration
                </TableHead>
                <TableHead
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.3 0.1 350)" }}
                >
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginHistory.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground py-8"
                    data-ocid="login-history.empty_state"
                  >
                    No login history yet
                  </TableCell>
                </TableRow>
              )}
              {loginHistory.map((h) => (
                <TableRow key={h.id} data-ocid={`login-history.row.${h.id}`}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmt(h.loginTime)}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {h.userName}
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-xs font-mono cursor-default"
                      title={h.principalId}
                    >
                      {truncatePrincipal(h.principalId)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {calcDuration(h.loginTime, h.logoutTime)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className="text-xs"
                      style={
                        h.status === "Active"
                          ? {
                              background: "oklch(0.92 0.12 142)",
                              color: "oklch(0.3 0.14 142)",
                              border: "none",
                            }
                          : h.status === "Logged Out"
                            ? {
                                background: "oklch(0.9 0 0)",
                                color: "oklch(0.45 0 0)",
                                border: "none",
                              }
                            : {
                                background: "oklch(0.92 0.12 60)",
                                color: "oklch(0.4 0.18 60)",
                                border: "none",
                              }
                      }
                    >
                      {h.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ---- Action badge helper ---- */
function ActionBadge({ action }: { action: ActivityLogEntry["action"] }) {
  const styles: Record<
    ActivityLogEntry["action"],
    { bg: string; color: string }
  > = {
    Created: { bg: "oklch(0.92 0.12 142)", color: "oklch(0.3 0.14 142)" },
    Updated: { bg: "oklch(0.92 0.1 240)", color: "oklch(0.3 0.15 240)" },
    Deleted: { bg: "oklch(0.93 0.1 30)", color: "oklch(0.4 0.18 30)" },
    Viewed: { bg: "oklch(0.92 0.05 290)", color: "oklch(0.4 0.1 290)" },
    Login: { bg: "oklch(0.92 0.12 142)", color: "oklch(0.3 0.14 142)" },
    Logout: { bg: "oklch(0.9 0 0)", color: "oklch(0.45 0 0)" },
  };
  const s = styles[action];
  return (
    <Badge
      className="text-xs"
      style={{ background: s.bg, color: s.color, border: "none" }}
    >
      {action}
    </Badge>
  );
}
