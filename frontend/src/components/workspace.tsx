"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Plus,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  WorkspaceSidebar,
  useSidebarCompact,
} from "@/components/navigation/workspace-sidebar";
import { navigationLocation } from "@/lib/navigation";
import axios from "axios";
import { api, csrf, errorMessage } from "@/lib/api";
import type { User, Organization, Catalog } from "@/lib/types";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

type WorkspaceState = {
  user: User;
  organizations: Organization[];
  organization: Organization | null;
  catalog: Catalog;
  refresh: () => Promise<void>;
  can: (permission: string) => boolean;
  notify: (message: string) => void;
};
const Context = createContext<WorkspaceState | null>(null);
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("Workspace is unavailable");
  return value;
}
export function Workspace({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const location = navigationLocation(path);
  const { compact, toggle } = useSidebarCompact();
  const [state, setState] = useState<Omit<
    WorkspaceState,
    "refresh" | "can" | "notify"
  > | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const me = await api.get("/api/v1/me");
      if (!me.data.data.user.email_verified_at) {
        router.replace(
          "/verify-email?next=" +
            encodeURIComponent(
              window.location.pathname + window.location.search,
            ),
        );
        return;
      }
      const [orgs, catalog] = await Promise.all([
        api.get("/api/v1/organizations"),
        api.get("/api/v1/catalog"),
      ]);
      await csrf();
      const organizations: Organization[] = orgs.data.data;
      setState({
        user: me.data.data.user,
        organizations,
        organization:
          organizations.find((o) => o.id === me.data.data.organization_id) ||
          organizations[0] ||
          null,
        catalog: catalog.data.data,
      });
      setError("");
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401)
        router.replace(
          "/login?next=" +
            encodeURIComponent(
              window.location.pathname + window.location.search,
            ),
        );
      else setError(errorMessage(e));
    }
  }, [router]);
  // Refresh only updates state after network I/O; the rule cannot follow this async boundary.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  async function switchOrg(id: string) {
    setSwitching(true);
    try {
      await api.post(`/api/v1/organizations/${id}/switch`);
      await refresh();
      router.push("/dashboard");
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSwitching(false);
    }
  }
  async function logout() {
    try {
      await csrf();
      await api.post("/api/v1/auth/logout");
      router.replace("/login");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  if (!state)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="space-y-6 text-center">
          <Brand />
          {error ? (
            <>
              <p role="alert" className="max-w-sm text-sm text-red-700">
                {error}
              </p>
              <Button onClick={refresh}>Try again</Button>
            </>
          ) : (
            <Loader2 className="mx-auto animate-spin text-primary" />
          )}
        </div>
      </div>
    );
  const can = (p: string) => !!state.organization?.permissions.includes(p);
  return (
    <Context.Provider value={{ ...state, refresh, can, notify: setNotice }}>
      <div
        className="min-h-screen bg-background"
        style={
          { "--sidebar-width": compact ? "80px" : "280px" } as CSSProperties
        }
      >
        <WorkspaceSidebar
          user={state.user}
          organization={state.organization}
          organizations={state.organizations}
          can={can}
          switching={switching}
          onSwitch={switchOrg}
          onLogout={logout}
          mobileOpen={open}
          onMobileOpenChange={setOpen}
          compact={compact}
          onToggleCompact={toggle}
        />
        <div className="workspace-content">
          <header className="flex h-20 items-center justify-between border-b bg-white/80 px-6 sm:px-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setOpen(true)}
                id="workspace-menu-toggle"
                aria-label="Open menu"
                aria-expanded={open}
                aria-controls="workspace-mobile-navigation"
                className="lg:hidden"
              >
                <Menu size={22} />
              </button>
              <div className="text-xs text-muted-foreground">
                <span className="hidden sm:inline">
                  {location.group}
                  <span className="mx-3 text-border">/</span>
                </span>
                <span className="font-medium text-foreground">
                  {location.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
                <span className="size-1.5 rounded-full bg-primary" />
                {state.organization?.country_code || "SEA"} workspace
              </span>
              <Link
                href="/organizations/new"
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                <Plus size={15} /> New organization
              </Link>
            </div>
          </header>
          <main className="mx-auto max-w-[1440px] px-6 py-8 sm:px-10 sm:py-10">
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
                <button
                  onClick={() => setError("")}
                  className="float-right"
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {notice && (
              <div
                role="status"
                className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-xl bg-[#103f35] px-5 py-4 text-sm text-white shadow-xl"
              >
                <CheckCircle2 size={18} />
                {notice}
              </div>
            )}
            <div key={state.organization?.id || "none"}>{children}</div>
            <footer className="mt-12 flex items-center justify-between border-t pt-5 text-[10px] text-muted-foreground">
              <span>Mekong · Logistics, connected.</span>
              <span className="flex items-center gap-1">
                Platform foundation <ArrowUpRight size={12} />
              </span>
            </footer>
          </main>
        </div>
      </div>
    </Context.Provider>
  );
}
