import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminNotificationSettings, adminSaveNotificationSettings } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
export function NotificationSettings({ accessToken }: { accessToken: string }) {
  const [enabled, setEnabled] = useState(false),
    [recipients, setRecipients] = useState(""),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState("");
  const [jobs, setJobs] = useState<
    { id: string; state: string; attempts: number; created_at: string }[]
  >([]);
  const load = useServerFn(adminNotificationSettings),
    save = useServerFn(adminSaveNotificationSettings);
  useEffect(() => {
    let active = true;
    setBusy(true);
    void load({ data: { accessToken } })
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setEnabled(result.value.settings.enabled);
          setRecipients(result.value.settings.recipients.join("\n"));
          setJobs(result.value.jobs);
        } else setMessage(result.error);
      })
      .catch(() => {
        if (active) setMessage("Notification settings unavailable.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, load]);
  return (
    <form
      className="grid max-w-2xl gap-4 rounded-2xl border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const result = await save({
            data: {
              accessToken,
              enabled,
              recipients: recipients
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean),
            },
          });
          if (result.ok) {
            setJobs(result.value.jobs);
            setMessage("Settings saved. Delivery also requires the configured email worker.");
          } else setMessage(result.error);
        } catch {
          setMessage("Could not save settings. Check email addresses.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-2xl font-semibold">Enquiry notifications</h2>
      <p className="text-muted-foreground">
        Notifications contain a link to the admin dashboard, without customer contact information.
        Configure the provider and scheduled worker before enabling.
      </p>
      {message && <p role="status">{message}</p>}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enable new-enquiry email notifications
      </label>
      <label>
        Recipients (one email per line, at most 10)
        <textarea
          className="mt-2 w-full rounded-md border bg-background p-3"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          rows={4}
        />
      </label>
      <Button disabled={busy}>{busy ? "Working…" : "Save notification settings"}</Button>
      <h3 className="font-semibold">Recent delivery jobs</h3>
      {!jobs.length ? (
        <p>No jobs queued.</p>
      ) : (
        <ul>
          {jobs.map((job) => (
            <li key={job.id} className="border-t py-2 text-sm">
              {job.state} · {job.attempts} attempts · {new Date(job.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
