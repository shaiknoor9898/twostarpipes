import { SITE } from "@/lib/site";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  adminDashboard,
  adminList,
  adminExport,
  adminUpdate,
  adminHistory,
} from "@/lib/admin.functions";
import { STATUSES, type Enquiry } from "@/lib/admin-schema";
import { ProductManager } from "@/components/admin/ProductManager";
import { NotificationSettings } from "@/components/admin/NotificationSettings";
import { Button } from "@/components/ui/button";

const field = "w-full rounded-md border bg-background p-3";
export function Admin() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("enquiries");
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [count, setCount] = useState(0);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [activity, setActivity] = useState<
    { id: string; action: string; entity_type: string; created_at: string }[]
  >([]);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [history, setHistory] = useState<
    {
      id: string;
      action: string;
      old_status: string | null;
      new_status: string | null;
      created_at: string;
    }[]
  >([]);
  const loadHistory = useServerFn(adminHistory);
  const selectedId = selected?.id;
  const selectedVersion = selected?.updated_at;
  useEffect(() => {
    let active = true;
    setHistory([]);
    if (selectedId && token)
      void loadHistory({ data: { accessToken: token, id: selectedId } })
        .then((result) => {
          if (active && result.ok) setHistory(result.value);
        })
        .catch(() => {
          if (active) setError("Status history unavailable.");
        });
    return () => {
      active = false;
    };
  }, [selectedId, selectedVersion, token, loadHistory]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Enquiry["status"] | undefined>();
  const [dealersOnly, setDealers] = useState(false);
  const [ascending, setAscending] = useState(false);
  const list = useServerFn(adminList),
    stats = useServerFn(adminDashboard),
    update = useServerFn(adminUpdate),
    exportRows = useServerFn(adminExport);
  const request = useRef(0);
  useEffect(() => {
    let active = true;
    try {
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (active) {
            setToken(data.session?.access_token || "");
            setReady(true);
          }
        })
        .catch(() => {
          if (active) {
            setError("Authentication is unavailable. Check configuration.");
            setReady(true);
          }
        });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) {
          setToken(session?.access_token || "");
          setRows([]);
          setSelected(null);
          setMetrics({});
          setActivity([]);
        }
      });
      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    } catch {
      setError("Authentication is unavailable. Check configuration.");
      setReady(true);
    }
    return () => {
      active = false;
    };
  }, []);
  const load = useCallback(async () => {
    if (!token) return;
    const current = ++request.current;
    setBusy(true);
    setError("");
    try {
      const [leads, summary] = await Promise.all([
        list({ data: { accessToken: token, search, status, dealersOnly, page, ascending } }),
        stats({ data: { accessToken: token } }),
      ]);
      if (current !== request.current) return;
      if (!leads.ok || !summary.ok) {
        setRows([]);
        setMetrics({});
        setActivity([]);
        setError(
          "Access denied or dashboard unavailable. Check your admin membership and configuration.",
        );
        return;
      }
      setRows(leads.value.rows);
      setCount(leads.value.count);
      setMetrics(summary.value.metrics);
      setActivity(summary.value.activity);
    } catch {
      if (current === request.current) setError("Could not load enquiries. Please retry.");
    } finally {
      if (current === request.current) setBusy(false);
    }
  }, [token, search, status, dealersOnly, page, ascending, list, stats]);
  const invalidate = useCallback(() => {
    request.current++;
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 300);
    return () => {
      clearTimeout(timer);
      invalidate();
    };
  }, [load, invalidate]);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const result = await supabase.auth.signInWithPassword({
        email: String(fields.get("email")),
        password: String(fields.get("password")),
      });
      if (result.error) setError("Sign-in failed. Check your credentials.");
      else form.reset();
    } catch {
      setError("Sign-in unavailable. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const result = await update({
        data: {
          accessToken: token,
          id: selected.id,
          status: selected.status,
          internal_notes: selected.internal_notes,
          follow_up_at: selected.follow_up_at,
          updated_at: selected.updated_at,
        },
      });
      if (!result.ok) {
        setError("Update unavailable or changed by another admin. Refresh before retrying.");
        return;
      }
      setSelected(result.value);
      await load();
    } catch {
      setError("Update failed. Refresh before retrying.");
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    setError("");
    try {
      const result = await exportRows({
        data: { accessToken: token, search, status, dealersOnly, page: 0, ascending },
      });
      if (!result.ok) {
        setError("Export unavailable. Narrow filters to at most 5000 records and retry.");
        return;
      }
      const url = URL.createObjectURL(
        new Blob(["\ufeff", result.value.csv], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "two-star-enquiries.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Export failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <p className="eyebrow">Two Star Pipes Industries</p>
      <h1 className="headline mt-2 text-3xl text-primary">Administration</h1>
      {error && (
        <p role="alert" className="my-4 rounded-lg border border-destructive p-4 text-destructive">
          {error}
        </p>
      )}
      {!ready ? (
        <p role="status">Checking session…</p>
      ) : !token ? (
        <form onSubmit={login} className="mt-8 grid max-w-md gap-4 rounded-2xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Admin sign in</h2>
          <p className="text-sm text-muted-foreground">
            Access is limited to approved administrators.
          </p>
          <label>
            Email
            <input
              className={field}
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={255}
            />
          </label>
          <label>
            Password
            <input
              className={field}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
          </label>
          <Button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
      ) : (
        <>
          <div className="my-6 flex flex-wrap gap-2">
            <Button
              variant={tab === "enquiries" ? "default" : "outline"}
              onClick={() => setTab("enquiries")}
            >
              Enquiries
            </Button>
            <Button
              variant={tab === "products" ? "default" : "outline"}
              onClick={() => setTab("products")}
            >
              Products
            </Button>
            <Button
              variant={tab === "settings" ? "default" : "outline"}
              onClick={() => setTab("settings")}
            >
              Notifications
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                request.current++;
                setToken("");
                setRows([]);
                setMetrics({});
                setSelected(null);
                setActivity([]);
                try {
                  await supabase.auth.signOut();
                } catch {
                  setError(
                    "Session cleared locally. Close this tab if sign-out could not reach the server.",
                  );
                }
              }}
            >
              Sign out
            </Button>
          </div>
          {tab === "products" ? (
            <ProductManager accessToken={token} />
          ) : tab === "settings" ? (
            <NotificationSettings accessToken={token} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
                {Object.entries(metrics).map(([label, value]) => (
                  <div key={label} className="rounded-xl border bg-card p-4">
                    <p className="text-sm capitalize text-muted-foreground">{label}</p>
                    <p className="text-3xl font-semibold text-primary">{value}</p>
                  </div>
                ))}
              </div>
              <div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label>
                  Search
                  <input
                    className={field}
                    value={search}
                    maxLength={100}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    placeholder="Name, phone or product"
                  />
                </label>
                <label>
                  Status
                  <select
                    className={field}
                    value={status || ""}
                    onChange={(e) => {
                      setStatus((e.target.value as Enquiry["status"]) || undefined);
                      setPage(0);
                    }}
                  >
                    <option value="">All statuses</option>
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dealersOnly}
                    onChange={(e) => {
                      setDealers(e.target.checked);
                      setPage(0);
                    }}
                  />
                  Dealer / wholesaler enquiries
                </label>
                <label>
                  Sort
                  <select
                    className={field}
                    value={String(ascending)}
                    onChange={(e) => setAscending(e.target.value === "true")}
                  >
                    <option value="false">Newest first</option>
                    <option value="true">Oldest first</option>
                  </select>
                </label>
                <div className="flex items-end gap-2">
                  <Button disabled={busy} onClick={() => void load()}>
                    Refresh
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => void download()}>
                    Export CSV
                  </Button>
                </div>
              </div>
              {busy && <p role="status">Loading…</p>}
              {!busy && !rows.length && (
                <p className="rounded-xl border p-6">No enquiries to display.</p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {rows.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setSelected(row)}
                    className="rounded-xl border bg-card p-5 text-left hover:border-primary"
                  >
                    <span className="font-semibold">{row.name}</span>
                    <span className="float-right rounded bg-muted px-2 py-1 text-xs">
                      {row.status}
                    </span>
                    <span className="mt-2 block">
                      {row.product} · {row.customer_type}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
              <div className="my-5 flex items-center gap-3">
                <Button
                  variant="outline"
                  disabled={busy || page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {page + 1} · {count} enquiries
                </span>
                <Button
                  variant="outline"
                  disabled={busy || (page + 1) * 25 >= count}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
              {selected && (
                <form
                  onSubmit={save}
                  className="my-8 grid gap-4 rounded-2xl border bg-card p-6 md:grid-cols-2"
                >
                  <h2 className="text-2xl font-semibold md:col-span-2">{selected.name}</h2>
                  <p>
                    {selected.phone} · {selected.email || "No email"}
                  </p>
                  <p>
                    {selected.city} · {selected.product} · {selected.quantity}
                  </p>
                  <p className="whitespace-pre-wrap md:col-span-2">
                    {selected.message || "No message"}
                  </p>
                  <p>Submitted {new Date(selected.created_at).toLocaleString()}</p>
                  <a
                    href={SITE.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Open company WhatsApp
                  </a>
                  <label>
                    Status
                    <select
                      className={field}
                      value={selected.status}
                      onChange={(e) =>
                        setSelected({ ...selected, status: e.target.value as Enquiry["status"] })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Follow-up date and time (your local timezone)
                    <input
                      className={field}
                      type="datetime-local"
                      value={
                        selected.follow_up_at
                          ? new Date(
                              new Date(selected.follow_up_at).getTime() -
                                new Date(selected.follow_up_at).getTimezoneOffset() * 60000,
                            )
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          follow_up_at: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        })
                      }
                    />
                  </label>
                  <label className="md:col-span-2">
                    Internal notes
                    <textarea
                      className={field}
                      rows={4}
                      maxLength={5000}
                      value={selected.internal_notes}
                      onChange={(e) => setSelected({ ...selected, internal_notes: e.target.value })}
                    />
                  </label>
                  <div className="md:col-span-2">
                    <h3 className="font-semibold">Status history (last 100 changes)</h3>
                    <ul>
                      {history.map((item) => (
                        <li key={item.id} className="border-t py-2 text-sm">
                          {item.action} | {item.old_status || "Created"} to{" "}
                          {item.new_status || "Unchanged"} ?{" "}
                          {new Date(item.created_at).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button disabled={busy}>Save enquiry</Button>
                  <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                    Close details
                  </Button>
                </form>
              )}
              <h2 className="mt-8 text-xl font-semibold">Recent activity and status history</h2>
              <ul className="mt-3 divide-y">
                {activity.map((item) => (
                  <li key={item.id} className="py-3 text-sm">
                    {item.action} · {item.entity_type} ·{" "}
                    {new Date(item.created_at).toLocaleString()}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
