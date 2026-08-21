import { notFound } from 'next/navigation';
import { getPaymentRequest } from '@/lib/payment-requests';

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const payment = await getPaymentRequest(token); if (!payment) notFound();
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5"><section className="w-full rounded-2xl border bg-card p-7 shadow-xl"><p className="text-sm font-medium text-emerald-700">Sitterfolio payment request</p><h1 className="mt-3 text-3xl font-semibold">{payment.description}</h1>{payment.customerNote && <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{payment.customerNote}</p>}<p className="mt-5 text-4xl font-semibold">{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(payment.amountCents/100)}</p>{payment.status === 'OPEN' ? <form action={`/api/pay/${token}/checkout`} method="post" className="mt-7"><button className="h-12 w-full rounded-lg bg-primary font-semibold text-primary-foreground">Continue to secure checkout</button></form> : <p className="mt-7 rounded-lg bg-muted p-4">This request is {payment.status.toLowerCase().replaceAll('_',' ')}.</p>}<p className="mt-5 text-xs text-muted-foreground">Payment is processed by Stripe for the independent pet-care business.</p></section></main>;
}
