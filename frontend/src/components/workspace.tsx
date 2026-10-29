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
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  WorkspaceSidebar,
  useSidebarCompact,
} from "@/components/navigation/workspace-sidebar";
import { WorkspaceHeader } from "@/components/navigation/workspace-header";
import { HeaderProvider, useHeaderContext } from "@/components/navigation/header-context";
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
  const [searchOpen, setSearchOpen] = useState(false);
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
      <HeaderProvider>
        <WorkspaceInner
          state={state}
          location={location}
          can={can}
          switching={switching}
          switchOrg={switchOrg}
          logout={logout}
          open={open}
          setOpen={setOpen}
          compact={compact}
          toggle={toggle}
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          error={error}
          setError={setError}
          notice={notice}
        >
          {children}
        </WorkspaceInner>
      </HeaderProvider>
    </Context.Provider>
  );
}

function WorkspaceInner({
  state,
  location,
  can,
  switching,
  switchOrg,
  logout,
  open,
  setOpen,
  compact,
  toggle,
  searchOpen,
  setSearchOpen,
  error,
  setError,
  notice,
  children,
}: {
  state: {
    user: User;
    organization: Organization | null;
    organizations: Organization[];
  };
  location: { group: string; label: string };
  can: (permission: string) => boolean;
  switching: boolean;
  switchOrg: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  open: boolean;
  setOpen: (open: boolean) => void;
  compact: boolean;
  toggle: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  error: string;
  setError: (err: string) => void;
  notice: string;
  children: ReactNode;
}) {
  const { config } = useHeaderContext();
  const isFullWidth = Boolean(config?.fullWidth);

  return (
    <div
      className={isFullWidth ? "h-screen bg-background overflow-hidden" : "min-h-screen bg-background"}
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
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
      />
      <div className={`workspace-content flex flex-col ${isFullWidth ? "h-screen overflow-hidden" : "min-h-screen"}`}>
        <WorkspaceHeader
          organization={state.organization}
          organizations={state.organizations}
          user={state.user}
          location={location}
          can={can}
          switching={switching}
          onSwitch={switchOrg}
          onLogout={logout}
          mobileOpen={open}
          onOpenMobileMenu={() => setOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main
          className={
            isFullWidth
              ? "flex-1 min-h-0 w-full flex flex-col overflow-hidden p-0 m-0 max-w-none"
              : "mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6"
          }
        >
          {error && (
            <div
              role="alert"
              className="mx-4 my-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
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
              className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-xl bg-[#0c2340] px-5 py-4 text-sm text-white shadow-xl"
            >
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}
          <div
            key={state.organization?.id || "none"}
            className={isFullWidth ? "flex-1 min-h-0 w-full flex flex-col overflow-hidden" : ""}
          >
            {children}
          </div>
          {!isFullWidth && !config?.hideFooter && (
            <footer className="mt-12 flex items-center justify-between border-t pt-5 text-[10px] text-muted-foreground">
              <span>Mekong · Logistics, connected.</span>
              <span className="flex items-center gap-1">
                Platform foundation <ArrowUpRight size={12} />
              </span>
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}
