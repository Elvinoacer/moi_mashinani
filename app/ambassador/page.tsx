"use client";
import { useEffect, useState } from "react";
import { AccountGate } from "@/components/AccountGate";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PhotoUploader } from "@/components/PhotoUploader";
import { BusinessEnrollmentForm } from "@/components/BusinessEnrollmentForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ZONES } from "@/lib/constants";
type Task = {
  id: string;
  name: string;
  zone: string;
  landmark: string;
  sellerType: string;
  proofId?: string;
  photos: string[];
  status: string;
};
function FieldTool() {
  const [zone, setZone] = useState("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completed, setCompleted] = useState(0);
  const [code, setCode] = useState("");
  const [enroll, setEnroll] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [evidence, setEvidence] = useState("");
  const [checks, setChecks] = useState({
    location: false,
    identity: false,
    consent: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/ambassador?zone=${zone}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setTasks(data.tasks);
        setCompleted(data.completed);
        setCode(data.referralCode);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [zone, refresh]);
  async function verify() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ambassador", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: selected.id,
          evidence,
          locationChecked: checks.location,
          identityChecked: checks.identity,
          ownerConsent: checks.consent,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelected(null);
      setRefresh((r) => r + 1);
      setNotice(
        "Field check recorded. Pending listings still need owner acceptance and admin approval.",
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="field-tool mx-auto max-w-5xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-bold">Campus field checklist</h1>
      <label className="block font-bold">
        Today’s zone
        <select
          className="ui-input"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        >
          {ZONES.map((z) => (
            <option key={z.slug} value={z.slug}>
              {z.name}
            </option>
          ))}
        </select>
      </label>
      <Card>
        <h2 className="text-xl font-bold">Today’s zone progress</h2>
        <p className="my-3">
          {completed} verified today · {tasks.length} visits waiting
        </p>
        <progress
          aria-label="Today's zone progress"
          className="h-4 w-full"
          max={Math.max(1, completed + tasks.length)}
          value={completed}
        />
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setEnroll(!enroll)}>
          {enroll ? "Back to visits" : "Quick enroll shop / hustle"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard
              .writeText(`${window.location.origin}/onboard?ref=${code}`)
              .then(() =>
                setNotice(
                  "Referral link copied. Share it with business owners.",
                ),
              )
              .catch(() => setError("Clipboard unavailable."));
          }}
        >
          Copy my referral link
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {enroll ? (
        <BusinessEnrollmentForm
          mode="field"
          onEnrolled={() => setRefresh((r) => r + 1)}
        />
      ) : selected ? (
        <Card className="space-y-4">
          <h2 className="text-xl font-bold">Verify {selected.name}</h2>
          <p>
            {selected.landmark} · {selected.zone}
          </p>
          {selected.proofId && (
            <a
              className="ui-button ui-button-secondary"
              target="_blank"
              rel="noopener noreferrer"
              href={`/api/enrollment/proof?id=${selected.proofId}`}
            >
              Review private student ID
            </a>
          )}
          <PhotoUploader
            enrollment
            camera
            label={
              selected.sellerType === "COMRADE"
                ? "Snap product / workspace (public)"
                : "Snap signboard (public)"
            }
            disabled={busy || !checks.consent}
            disabledReason="Confirm owner consent first."
            onBusyChange={setBusy}
            onUploaded={async (urls) => {
              const response = await fetch("/api/ambassador/photo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  businessId: selected.id,
                  photo: urls[0],
                  ownerConsent: checks.consent,
                }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              setNotice("Field photo saved to the public listing.");
            }}
          />
          <p>
            Inspect the{" "}
            {selected.sellerType === "COMRADE"
              ? "student identity and product sample"
              : "shop signboard"}{" "}
            and safe campus location. Record only the outcome, never the
            student’s ID number.
          </p>
          {(["location", "identity", "consent"] as const).map((key) => (
            <label key={key} className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={checks[key]}
                onChange={(e) =>
                  setChecks((c) => ({ ...c, [key]: e.target.checked }))
                }
              />
              {key === "location"
                ? "Location / zone checked"
                : key === "identity"
                  ? "Shop or student identity checked"
                  : "Owner consent confirmed"}
            </label>
          ))}
          <label className="block font-bold">
            Evidence summary
            <Input
              value={evidence}
              maxLength={500}
              onChange={(e) => setEvidence(e.target.value)}
            />
          </label>
          <Button
            disabled={
              busy ||
              !Object.values(checks).every(Boolean) ||
              evidence.trim().length < 12
            }
            onClick={() => void verify()}
          >
            Record field verification
          </Button>
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Back
          </Button>
        </Card>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {tasks.length ? (
            tasks.map((t) => (
              <Card className="space-y-3" key={t.id}>
                <h2 className="text-xl font-bold">{t.name}</h2>
                <p>
                  {t.landmark} · {t.zone}
                </p>
                <p>
                  {t.sellerType === "COMRADE"
                    ? "Comrade / hostel seller"
                    : "Shopfront"}
                </p>
                <Button
                  onClick={() => {
                    setSelected(t);
                    setChecks({
                      location: false,
                      identity: false,
                      consent: false,
                    });
                    setEvidence("");
                    setError("");
                  }}
                >
                  Verify location & identity
                </Button>
              </Card>
            ))
          ) : (
            <Card>
              <p>
                All requested visits in this zone are cleared. Enroll another
                nearby business or switch zones.
              </p>
            </Card>
          )}
        </section>
      )}
    </main>
  );
}
export default function AmbassadorPage() {
  return (
    <div className="interior-page">
      <Navbar />
      <AccountGate requiredRole="AMBASSADOR">
        <FieldTool />
      </AccountGate>
      <Footer />
    </div>
  );
}
