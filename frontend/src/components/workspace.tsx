"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Network,
  ScrollText,
  LogOut,
  Plus,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  ShieldCheck,
  Loader2,
  CheckCircle2,
} from "lucide-react";
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
const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/team", label: "Team members", icon: Users },
  { href: "/departments", label: "Departments", icon: Network },
  {
    href: "/audit",
    label: "Activity log",
    icon: ScrollText,
    permission: "audit.view",
  },
];
export function Workspace({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
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
      <div className="min-h-screen bg-background">
        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-border bg-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex h-24 items-center justify-between px-7">
            <Link href="/dashboard" aria-label="Mekong home">
              <Brand />
            </Link>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="lg:hidden"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-4">
            <div className="rounded-xl border bg-[#fafbf9] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow text-muted-foreground">WORKSPACE</span>
                <Building2 size={14} className="text-primary" />
              </div>
              <div className="relative">
                <select
                  aria-label="Switch organization"
                  value={state.organization?.id || ""}
                  onChange={(e) => switchOrg(e.target.value)}
                  disabled={switching}
                  className="w-full appearance-none truncate bg-transparent pr-5 text-sm font-semibold outline-none"
                >
                  {state.organizations.length ? (
                    state.organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Create a workspace</option>
                  )}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-0 top-1"
                  size={14}
                />
              </div>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {state.organization?.role || "Let’s get started"}
              </p>
            </div>
          </div>
          <div className="mt-8 px-7 text-[10px] font-semibold tracking-[.15em] text-muted-foreground">
            WORKSPACE
          </div>
          <nav className="mt-3 space-y-1 px-4">
            {links
              .filter((l) => !l.permission || can(l.permission))
              .map((l) => (
                <Link
                  key={l.href}
                  onClick={() => setOpen(false)}
                  href={l.href}
                  className={`nav-link ${path === l.href ? "active" : ""}`}
                >
                  <l.icon size={18} />
                  {l.label}
                  {path === l.href && (
                    <span className="ml-auto size-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
          </nav>
          <div className="mx-5 mt-auto mb-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <ShieldCheck size={19} className="text-primary" />
            <p className="mt-3 text-xs font-semibold">
              A foundation for growth
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Your companies and people, connected in one secure place.
            </p>
            <span className="mt-3 inline-block text-[10px] font-medium text-primary">
              PLATFORM v0.1
            </span>
          </div>
          <div className="flex items-center gap-3 border-t p-5">
            <div className="avatar">
              {state.user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">
                {state.user.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {state.user.email}
              </p>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>
        <div className="lg:pl-[248px]">
          <header className="flex h-20 items-center justify-between border-b bg-white/80 px-6 sm:px-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="lg:hidden"
              >
                <Menu size={22} />
              </button>
              <div className="text-xs text-muted-foreground">
                Workspace <span className="mx-3 text-border">/</span>
                <span className="font-medium text-foreground">
                  {links.find((l) => l.href === path)?.label ||
                    "Company settings"}
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
