import Link from "next/link";

export default function DeveloperDocsPage() {
  return (
    <main className="container-shell py-16">
      <Link href="/" className="font-bold text-brand-700">Takapay</Link>
      <h1 className="mt-8 text-3xl font-bold">Developer documentation</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">Takapay’s REST API and adapter interfaces are being prepared. API keys can be generated in your merchant workspace, but payment creation requires a verified payment provider adapter.</p>
      <section className="mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-amber-950">Payments are not enabled in this installation</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">Do not use generated keys to collect live payments. The payment endpoint currently returns an explicit unavailable response until provider-specific create, callback, refund, and reconciliation flows have been implemented and tested.</p>
      </section>
      <h2 className="mt-10 text-xl font-semibold">Request shape</h2>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-slate-100"><code>{`POST /api/v1/payments
x-takapay-public-key: tpk_test_...
Authorization: Bearer tsk_test_...
Content-Type: application/json

{
  "idempotencyKey": "order-unique-reference-0001",
  "gatewayCode": "bkash",
  "amountMinor": 245000,
  "currency": "BDT",
  "customer": { "email": "buyer@example.com" }
}`}</code></pre>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Amounts use integer minor units (paisa for BDT). Keep secret API keys server-side. The exact signature headers and callback event contract will be published after adapter verification.</p>
    </main>
  );
}
