"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
export function FieldTeam() {
  const [team, setTeam] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      enrolled: number;
      verified: number;
      paidConversions?: number;
      revenueKes?: number;
      commissionKes?: number;
    }>
  >([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/ambassadors", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setTeam(data);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [refresh]);
  return (
    <details className="ui-card">
      <summary className="cursor-pointer font-bold">
        Field ambassadors &amp; referral results
      </summary>
      <div className="mt-4 space-y-4">
        {team.map((a) => (
          <p className="text-sm" key={a.id}>
            <strong>{a.name}</strong> · {a.enrolled} listings attributed ·{" "}
            {a.verified} field checks · {a.paidConversions ?? 0} paid upgrades ·{" "}
            <span className="font-semibold text-[#183e35]">
              KES {(a.commissionKes ?? 0).toLocaleString("en-KE")} commission
            </span>
          </p>
        ))}
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const response = await fetch("/api/admin/ambassadors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email }),
              });
              const data = await response.json();
              if (!response.ok || !data.invitation.sent)
                throw new Error(data.error || data.invitation.error);
              setNotice(
                "Field account invitation sent. The ambassador must accept it to access field tools.",
              );
              setRefresh((r) => r + 1);
            } catch (cause) {
              setError((cause as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="text-sm">
            Ambassador name
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Ambassador email
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <Button disabled={busy} type="submit">
            Invite field ambassador
          </Button>
        </form>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </div>
    </details>
  );
}
