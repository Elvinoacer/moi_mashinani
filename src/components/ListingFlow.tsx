"use client";

import Image from "next/image";
import { Check, CheckCircle2, ImageIcon, LoaderCircle, Save, Sparkles, Trash2 } from "lucide-react";
import styles from "./ListingFlow.module.css";

export function ListingFlowHeader({ step, title, description, labels = ["Details & photos", "Review & submit"] }: {
  step: number; title: string; description: string; labels?: [string, string];
}) {
  return <div className={styles.hero}>
    <span className={styles.eyebrow}><Sparkles size={13} aria-hidden="true" /> Your next customer is on campus</span>
    <h2 id="enrollment-stage-heading" tabIndex={-1}>{title}</h2>
    <p>{description}</p>
    <ol className={styles.steps} aria-label="Listing setup steps">
      {labels.map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
        <span className={styles.stepNumber}>{step > index + 1 ? <Check size={13} aria-hidden="true" /> : index + 1}</span>{label}
      </li>)}
    </ol>
    <span role="progressbar" aria-label="Listing setup progress" aria-valuemin={0} aria-valuemax={2} aria-valuenow={step} className="sr-only">Step {step} of 2</span>
  </div>;
}

export function ListingPhotoGallery({ photos, coverPhoto, disabled, onCover, onRemove }: {
  photos: string[]; coverPhoto: string; disabled?: boolean;
  onCover: (url: string) => void; onRemove: (url: string) => void;
}) {
  if (!photos.length) return null;
  return <div className={styles.gallery} role="group" aria-label="Listing photos">
    {photos.map((url, index) => <div key={url} className={styles.photo}>
      <Image unoptimized src={url} alt={`Listing photo ${index + 1}`} width={360} height={270} />
      {coverPhoto === url && <span className={styles.coverBadge}><ImageIcon size={11} aria-hidden="true" />Cover photo</span>}
      <div className={styles.photoActions}>
        <button type="button" disabled={disabled || coverPhoto === url} aria-label={`Use photo ${index + 1} as cover`} onClick={() => onCover(url)}>{coverPhoto === url ? "Your cover" : "Use as cover"}</button>
        <button type="button" disabled={disabled} aria-label={`Remove listing photo ${index + 1}`} onClick={() => onRemove(url)}><Trash2 size={15} aria-hidden="true" /></button>
      </div>
    </div>)}
  </div>;
}

export function ListingSaveBar({ form, dirty, busy, label, error, onReset, status, publicUrl }: {
  form: string; dirty: boolean; busy: boolean; label: string; error?: string;
  onReset?: () => void; status?: string; publicUrl?: string;
}) {
  return <div className={styles.saveBarSpace}>
    <div className={styles.saveBar} aria-label="Save listing changes">
      <div className={styles.saveStatus} data-error={Boolean(error)} role="status" aria-live="polite">
        {busy ? <LoaderCircle size={19} className="shrink-0 animate-spin" aria-hidden="true" /> : dirty ? <span className={styles.saveDot} /> : <CheckCircle2 size={19} className="shrink-0" aria-hidden="true" />}
        <div><strong>{busy ? "Saving your changes…" : error ? "Couldn’t save changes" : dirty ? "You have unsaved changes" : "All changes saved"}</strong>
          <p>{error || status || (dirty ? "Save to update your listing." : "Your listing is up to date.")}</p>
        </div>
      </div>
      <div className={styles.saveButtons}>
        {dirty && onReset && <button type="button" disabled={busy} onClick={onReset} className={styles.textButton}>Discard</button>}
        {!dirty && publicUrl && <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={styles.textButton}>View public listing ↗</a>}
        <button type="submit" form={form} disabled={busy || !dirty} className={styles.saveButton}><Save size={16} aria-hidden="true" />{busy ? "Saving…" : label}</button>
      </div>
    </div>
  </div>;
}
