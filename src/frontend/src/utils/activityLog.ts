export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  userName: string;
  action: "Created" | "Updated" | "Deleted" | "Viewed" | "Login" | "Logout";
  module: string;
  details: string;
}

export function logActivity(
  action: ActivityLogEntry["action"],
  module: string,
  details: string,
): void {
  const profile = JSON.parse(localStorage.getItem("jt_user_profile") || "{}");
  const entry: ActivityLogEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    userName: (profile.displayName as string) || "Unknown",
    action,
    module,
    details,
  };
  const logs: ActivityLogEntry[] = JSON.parse(
    localStorage.getItem("jt_activity_log") || "[]",
  );
  logs.unshift(entry);
  localStorage.setItem("jt_activity_log", JSON.stringify(logs.slice(0, 500)));
}
