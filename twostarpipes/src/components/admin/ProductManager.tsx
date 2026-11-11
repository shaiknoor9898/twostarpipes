import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminProducts,
  adminSaveProduct,
  adminDeleteProduct,
  adminUpload,
  adminImportCatalogue,
} from "@/lib/admin.functions";
import { productSchema, type ManagedProduct } from "@/lib/admin-schema";
import { Button } from "@/components/ui/button";

const empty: ManagedProduct = {
  slug: "",
  name: "",
  category: "",
  short: "",
  description: "",
  image: "",
  uses: [],
  sizes: [],
  gauges: [],
  advantages: [],
  specifications: "",
  brochure: "",
  published: false,
};
const field = "w-full rounded-md border bg-background p-3";
export function ProductManager({ accessToken }: { accessToken: string }) {
  const [items, setItems] = useState<ManagedProduct[]>([]),
    [editing, setEditing] = useState<ManagedProduct | null>(null),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [message, setMessage] = useState("");
  const list = useServerFn(adminProducts),
    save = useServerFn(adminSaveProduct),
    remove = useServerFn(adminDeleteProduct),
    upload = useServerFn(adminUpload),
    seed = useServerFn(adminImportCatalogue);
  const reload = useCallback(async () => {
    setBusy(true);
    setLoaded(false);
    try {
      const result = await list({ data: { accessToken } });
      if (result.ok) {
        setItems(result.value);
        setLoaded(true);
      } else {
        setItems([]);
        setMessage(result.error);
      }
    } catch {
      setItems([]);
      setEditing(null);
      setMessage("Products unavailable.");
    } finally {
      setBusy(false);
    }
  }, [accessToken, list]);
  useEffect(() => {
    setItems([]);
    setEditing(null);
    void reload();
  }, [reload]);
  async function persist(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || busy || !loaded) return;
    const parsed = productSchema.safeParse({
      ...editing,
      uses: editing.uses.filter((v) => v.trim()),
      sizes: editing.sizes.filter((v) => v.trim()),
      gauges: editing.gauges.filter((v) => v.trim()),
      advantages: editing.advantages.filter((v) => v.trim()),
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      return;
    }
    setBusy(true);
    try {
      const result = await save({ data: { accessToken, product: parsed.data } });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setEditing(null);
      setMessage("Product saved.");
      await reload();
    } catch {
      setMessage("Could not save product.");
    } finally {
      setBusy(false);
    }
  }
  async function asset(file: File | undefined, kind: "image" | "brochure") {
    if (!file || !editing || busy || !loaded) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("File must be at most 5 MB.");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
    if (
      !allowed.includes(file.type as (typeof allowed)[number]) ||
      (kind === "brochure") !== (file.type === "application/pdf")
    ) {
      setMessage("Use JPEG, PNG, WebP or PDF.");
      return;
    }
    setBusy(true);
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Read failed"));
        reader.readAsDataURL(file);
      });
      const result = await upload({
        data: { accessToken, kind, mime: file.type as (typeof allowed)[number], content },
      });
      if (result.ok)
        setEditing((p) =>
          p ? { ...p, [kind === "image" ? "image" : "brochure"]: result.value } : p,
        );
      else setMessage(result.error);
    } catch {
      setMessage("Upload failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold">Product management</h2>
      <p className="my-3 text-muted-foreground">
        Import the current catalogue once before enabling managed products. Imports preserve
        existing records. Uploaded files are public catalogue assets; never upload customer
        information.
      </p>
      {message && (
        <p role="status" className="my-4 rounded-lg border p-3">
          {message}
        </p>
      )}
      <div className="my-4 flex flex-wrap gap-3">
        <Button
          disabled={busy || !loaded}
          onClick={() => {
            setEditing({ ...empty });
            setMessage("");
          }}
        >
          Create product
        </Button>
        <Button
          variant="outline"
          disabled={busy || !loaded}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await seed({ data: { accessToken } });
              setMessage(
                result.ok
                  ? "Existing catalogue imported without overwriting records."
                  : result.error,
              );
              await reload();
            } catch {
              setMessage("Import failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Import current catalogue
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void reload()}>
          Refresh
        </Button>
      </div>
      {busy && <p role="status">Working…</p>}
      {!busy && loaded && !items.length && (
        <p>No products available. Configure the staging database and import the catalogue.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <button
            key={p.slug}
            disabled={busy || !loaded}
            className="rounded-xl border bg-card p-5 text-left"
            onClick={() => setEditing(p)}
          >
            <strong>{p.name}</strong>
            <span className="block text-sm">
              {p.category} · {p.published ? "Published" : "Draft"}
            </span>
          </button>
        ))}
      </div>
      {editing && (
        <form
          onSubmit={persist}
          className="mt-8 grid gap-4 rounded-2xl border bg-card p-6 md:grid-cols-2"
        >
          <fieldset disabled={busy || !loaded} className="contents">
            <h3 className="text-xl font-semibold md:col-span-2">Edit product</h3>
            {(["slug", "name", "category", "short", "image", "brochure"] as const).map((key) => (
              <label key={key} className="capitalize">
                {key}
                <input
                  className={field}
                  value={editing[key]}
                  disabled={key === "slug" && items.some((p) => p.slug === editing.slug)}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  required={key !== "brochure"}
                />
              </label>
            ))}
            {(["description", "specifications"] as const).map((key) => (
              <label key={key} className="capitalize md:col-span-2">
                {key}
                <textarea
                  className={field}
                  rows={4}
                  value={editing[key]}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                />
              </label>
            ))}
            {(["uses", "sizes", "gauges", "advantages"] as const).map((key) => (
              <label key={key} className="capitalize">
                {key} (one per line)
                <textarea
                  className={field}
                  rows={4}
                  value={editing[key].join("\n")}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value.split("\n") })}
                />
              </label>
            ))}
            <label>
              Upload image (JPEG / PNG / WebP, max 5 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => void asset(e.target.files?.[0], "image")}
              />
            </label>
            <label>
              Upload brochure (PDF, max 5 MB)
              <input
                type="file"
                accept="application/pdf"
                disabled={busy}
                onChange={(e) => void asset(e.target.files?.[0], "brochure")}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published
            </label>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button disabled={busy}>Save product</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              {items.some((p) => p.slug === editing.slug) && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Delete ${editing.name}? Existing enquiry records will be retained.`,
                      )
                    )
                      return;
                    setBusy(true);
                    try {
                      const result = await remove({ data: { accessToken, slug: editing.slug } });
                      if (result.ok) {
                        setEditing(null);
                        setMessage("Product deleted. Enquiry history retained.");
                        await reload();
                      } else setMessage(result.error);
                    } catch {
                      setMessage("Deletion failed.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete product
                </Button>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
}
