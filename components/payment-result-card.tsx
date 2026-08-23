import Link from 'next/link';
import { Check, LoaderCircle } from 'lucide-react';
import styles from './payment-result-card.module.css';

const CONFETTI = [
  ['8%', '-11deg', '0ms', '#d8b66a'],
  ['15%', '7deg', '110ms', '#7fa78d'],
  ['23%', '-5deg', '45ms', '#f3ead3'],
  ['31%', '12deg', '190ms', '#bfc9c0'],
  ['39%', '-9deg', '85ms', '#d8b66a'],
  ['47%', '5deg', '225ms', '#7fa78d'],
  ['55%', '-13deg', '25ms', '#f3ead3'],
  ['63%', '8deg', '150ms', '#d8b66a'],
  ['71%', '-6deg', '70ms', '#7fa78d'],
  ['79%', '11deg', '205ms', '#bfc9c0'],
  ['87%', '-8deg', '125ms', '#f3ead3'],
  ['93%', '6deg', '15ms', '#d8b66a'],
] as const;

function Confetti() {
  return (
    <div className={styles.confetti} aria-hidden="true">
      {CONFETTI.map(([left, drift, delay, color], index) => (
        <i
          key={`${left}-${delay}`}
          className={index % 3 === 0 ? styles.ribbon : styles.piece}
          style={{ '--left': left, '--drift': drift, '--delay': delay, '--confetti': color } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function PaymentResultCard({ confirmed, message, returnHref }: { confirmed: boolean; message: string; returnHref?: string }) {
  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        {confirmed ? <Confetti /> : null}
        <div className={confirmed ? styles.successMark : styles.pendingMark} aria-hidden="true">
          {confirmed ? <Check strokeWidth={2.25} /> : <LoaderCircle />}
        </div>
        <p className={styles.eyebrow}>{confirmed ? 'Payment complete' : 'Secure payment'}</p>
        <h1>{confirmed ? 'Payment confirmed' : 'Processing payment...'}</h1>
        <p className={styles.message}>{message}</p>
        {returnHref ? (
          <Link href={returnHref} className={styles.returnLink}>
            Return to the sitter&apos;s site <span aria-hidden="true">→</span>
          </Link>
        ) : null}
        {confirmed ? <p className={styles.receiptNote}>Processed securely by Stripe.</p> : null}
      </section>
    </main>
  );
}
