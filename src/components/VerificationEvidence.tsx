"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
export function VerificationEvidence({
  slug,
  businessId,
  owner = false,
  comrade = false,
}: {
  slug?: string;
  businessId?: string;
  owner?: boolean;
  comrade?: boolean;
}) {
  const [proof, setProof] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      businessId
        ? `/api/admin/audit?businessId=${businessId}`
        : `/api/businesses/${slug}/verification`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setProof(data.proofId || "");
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [slug, businessId]);
  async function request(file?: File) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let proofId: string | undefined;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/enrollment/proof", {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        proofId = data.proofId;
      }
      const response = await fetch(`/api/businesses/${slug}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (proofId) setProof(proofId);
      setNotice("Your verification visit is in the field queue.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      {proof && (
        <a
          className="ui-button ui-button-secondary"
          href={`/api/enrollment/proof?id=${proof}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Review private student ID
        </a>
      )}
      {owner && (
        <>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void request()}
          >
            Request free verification visit
          </Button>
          {comrade && (
            <label className="block text-sm font-bold">
              Update student ID privately
              <input
                className="ui-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => void request(e.target.files?.[0])}
              />
            </label>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
