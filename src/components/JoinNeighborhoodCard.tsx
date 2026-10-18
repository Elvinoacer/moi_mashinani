import Link from "@/components/MotionLink";
import Image from "next/image";
import { ArrowUpRight, MapPin, Store } from "lucide-react";
import styles from "./JoinNeighborhoodCard.module.css";

export function JoinNeighborhoodCard() {
  return (
    <section data-motion="reveal" aria-labelledby="join-neighborhood-heading" className={styles.card}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          <Store size={15} aria-hidden="true" /> For local businesses
        </p>
        <h2 id="join-neighborhood-heading" className={styles.heading}>
          Your next customer is <span>already nearby.</span>
        </h2>
        <p className={styles.description}>
          Make sure they can find you. Share your services and prices, and let
          customers call or WhatsApp you directly.
        </p>
        <div className={styles.actions}>
          <Link href="/onboard" className={styles.primaryAction}>
            List my business — free <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/dashboard" className={styles.secondaryAction}>
            Manage listing
          </Link>
        </div>
        <p className={styles.note}>Free basic listing. Your business, your customers.</p>
      </div>
      <figure className={styles.scene}>
        <Image
          src="/images/talai_stage.webp"
          alt="Shops and boda riders outside Talai Centre in Kesses"
          fill
          sizes="(max-width: 639px) calc(100vw - 24px), (max-width: 1152px) 44vw, 490px"
          className={styles.photo}
        />
        <figcaption className={styles.caption}>
          <MapPin size={14} aria-hidden="true" /> Talai Centre, Kesses
        </figcaption>
        <div className={styles.sceneMessage} aria-hidden="true">
          Local shops.<br />Everyday connections.
        </div>
      </figure>
    </section>
  );
}
