'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Building2, Check, Clock3, Copy, Info, MapPin, QrCode, Trash2, Upload, Wifi } from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { Spinner } from '@/app/components/Spinner';
import { Badge } from '@/app/components/Badge';

type Bill = { id: string; billingPeriod: string; amount: number; dueDate: string; status: string; paymentMethod?: 'GCash' | 'Walk-in' | null; referenceNumber?: string | null; receiptImage?: string | null };
type Account = { name: string; id: string; planName: string; speedMbps: number; monthlyPrice: number };
type SubmittedPayment = { bill: Bill; method: 'GCash' | 'Walk-in'; referenceNumber: string; receiptPreview: string };

const qrPattern = '111101001111101010100101101110101011101001011101110100101010111101101011101111010010111010100101101111101010111011101001011110101011101';

function QrPreview() {
  return <div className="grid h-36 w-36 grid-cols-13 gap-0.5 rounded-xl bg-white p-3 shadow-sm">{qrPattern.split('').map((bit, index) => <span className={bit === '1' ? 'bg-[#2447b6]' : 'bg-white'} key={index} />)}</div>;
}

export default function PayBillsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [method, setMethod] = useState<'GCash' | 'Walk-in'>('GCash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [copied, setCopied] = useState(false);
  const [submittedPayment, setSubmittedPayment] = useState<SubmittedPayment | null>(null);
  const queryClient = useQueryClient();
  const bills = useQuery({ queryKey: ['bills'], queryFn: async () => { const response = await fetch('/api/bills'); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to load bills.'); return result.data as Bill[]; } });
  const account = useQuery({ queryKey: ['account'], queryFn: async () => { const response = await fetch('/api/account'); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to load account.'); return result.data as Account; } });
  const bill = submittedPayment?.bill || bills.data?.find((item) => item.id === selected) || bills.data?.find((item) => item.status !== 'Paid') || bills.data?.[0];
  const isPaid = bill?.status === 'Paid';
  const isPendingConfirmation = bill?.status === 'Pending_Confirmation';
  const pendingPayment = submittedPayment || (isPendingConfirmation && bill ? {
    bill,
    method: bill.paymentMethod || 'GCash',
    referenceNumber: bill.referenceNumber || '',
    receiptPreview: bill.receiptImage || '',
  } : null);
  const payment = useMutation({
    mutationFn: async () => {
      const receiptImage = receiptFile ? await readReceiptAsDataUrl(receiptFile) : receiptPreview;
      const response = await fetch(`/api/bills/${selected}/pay`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethod: method, referenceNumber, receiptImage }) });
      const responseText = await response.text();
      let result: { data?: Bill; error?: string };
      try {
        result = JSON.parse(responseText) as { data?: Bill; error?: string };
      } catch {
        throw new Error(responseText || 'Payment submission failed.');
      }
      if (!response.ok) throw new Error(result.error || 'Payment failed.');
      return { bill: result.data as Bill, receiptImage };
    },
    onSuccess: ({ bill: paidBill, receiptImage }) => {
      setSubmittedPayment({ bill: paidBill, method, referenceNumber, receiptPreview: receiptImage });
      setSelected(null);
      setReferenceNumber('');
      setReceiptFile(null);
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });

  function readReceiptAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Unable to read the receipt image.'));
      };
      reader.onerror = () => reject(new Error('Unable to read the receipt image.'));
      reader.readAsDataURL(file);
    });
  }

  function handleReceiptChange(file: File | undefined) {
    if (!file) return;
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  function removeReceipt() {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(null);
    setReceiptPreview('');
  }

  function copyNumber() {
    navigator.clipboard.writeText('09091423431').then(() => setCopied(true)).catch(() => undefined);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <PortalShell role="subscriber">
    <div className="flex min-h-screen flex-col bg-[#f7f9fc]">
      <header className="flex shrink-0 items-center gap-3 bg-[#2447b6] px-5 py-5 text-white sm:px-8 lg:px-10">
        <Link href="/subscriber/my-account" aria-label="Back to home" className="rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold">Pay Bills</h1>
      </header>
      <main className="px-4 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl space-y-5 lg:max-w-3xl">
          {bills.isLoading && <p className="text-sm text-slate-500">Loading bill...</p>}
          {bills.error && <p className="text-sm font-semibold text-red-600">{(bills.error as Error).message}</p>}
          {bill ? <>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2166f3]"><Wifi size={20} /></span>
                  <div><p className="text-sm font-bold text-slate-900">{account.data?.name || 'Subscriber'}</p><p className="text-xs text-slate-400">{account.data?.id || 'Account'}</p></div>
                </div>
                <Badge value={isPaid ? 'Paid' : isPendingConfirmation ? 'Pending Confirmation' : 'Unpaid'} />
              </div>
              <div className="flex items-center justify-between gap-4 pt-4">
                <p className="text-sm text-slate-500">Amount to pay</p>
                <p className={`text-xl font-bold ${isPaid ? 'text-emerald-600' : 'text-[#2447b6]'}`}>{isPaid ? 'Paid' : `₱${bill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}</p>
              </div>
              {!isPaid && !isPendingConfirmation && <button type="button" onClick={() => setSelected(bill.id)} className="mt-4 w-full rounded-xl bg-[#2f68e6] px-4 py-3 text-base font-bold text-white transition hover:bg-[#2258d1]">Pay Now</button>}
            </section>

            {pendingPayment && !selected ? <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-200 text-amber-700"><Clock3 size={20} /></span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-amber-900">{pendingPayment.method === 'GCash' ? 'GCash Payment Submitted — Awaiting Admin Confirmation' : 'Cash Payment Submitted — Awaiting Admin Confirmation'}</h2>
                  <p className="font-mono text-xs text-amber-800">Ref: #{pendingPayment.referenceNumber}</p>
                </div>
              </div>
              <span className="mt-3 inline-flex rounded-full bg-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-800">Under Review</span>
              <p className="mt-4 text-xs leading-5 text-amber-800">Your {pendingPayment.method === 'GCash' ? 'GCash receipt and transaction number' : 'cash receipt and official receipt number'} have been sent to our admin billing team for verification. Once confirmed by the admin, your due bill will automatically be cleared.</p>
              <div className="mt-4 rounded-xl border border-amber-300 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Uploaded {pendingPayment.method === 'GCash' ? 'GCash receipt' : 'cash receipt'}</p>
                {pendingPayment.receiptPreview ? <img src={pendingPayment.receiptPreview} alt="" className="mt-2 h-44 w-full rounded-lg bg-slate-900 object-contain" /> : <p className="mt-2 text-xs text-slate-500">Receipt image unavailable.</p>}
              </div>
              <button type="button" onClick={() => { setSubmittedPayment(null); setSelected(bill.id); setReferenceNumber(pendingPayment.referenceNumber); }} className="mt-4 w-full text-center text-xs font-bold text-amber-900 underline">Update Reference Number or Re-upload Receipt</button>
            </section> : selected && !isPaid ? <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">Select Payment Method</h2>
                <p className="mt-1 text-xs text-slate-500">Instant payment confirmation available 24/7</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#2166f3]"><Check size={13} /> Zero Convenience Fee</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setMethod('GCash')} className={`relative rounded-xl border-2 px-3 py-4 text-sm font-bold transition ${method === 'GCash' ? 'border-[#2f68e6] text-[#2166f3]' : 'border-slate-200 text-slate-700'}`}>
                  {method === 'GCash' && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2f68e6] px-3 py-1 text-[9px] font-bold uppercase text-white">Recommended</span>}
                  <QrCode className="mx-auto mb-2" size={20} />GCash QR &amp; Transfer
                </button>
                <button type="button" onClick={() => setMethod('Walk-in')} className={`rounded-xl border-2 px-3 py-4 text-sm font-bold transition ${method === 'Walk-in' ? 'border-[#2f68e6] text-[#2166f3]' : 'border-slate-200 text-slate-700'}`}><Building2 className="mx-auto mb-2" size={20} />Office Cash Payment</button>
              </div>

              {method === 'GCash' ? <div className="mt-5 rounded-2xl border border-blue-200 bg-[#f4f8ff] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#2447b6]"><Info size={16} /> Pay with GCash QR or Express Send</p>
                <div className="mt-4 flex flex-col items-center"><QrPreview /><p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Scan with GCash</p></div>
                <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Official GCash mobile number</p><div className="mt-2 flex items-center justify-between gap-2"><strong className="font-mono text-xs">09091423431</strong><button type="button" onClick={copyNumber} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"><Copy size={13} />{copied ? 'Copied' : 'Copy'}</button></div></div>
                <div className="mt-3 rounded-xl border border-blue-100 bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Registered account name</p><strong className="mt-2 block text-xs text-slate-800">SKY-TECH FIBER ISP / GALIT ENTERPRISES</strong></div>
              </div> : <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Building2 size={17} /> Walk-in Over-The-Counter Payment</h3>
                <p className="mt-3 text-xs leading-5 text-slate-600">Pay directly with cash at our main business office. Our customer service representative will issue an official printed receipt immediately.</p>
                <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600"><p className="flex gap-2"><MapPin size={15} className="shrink-0 text-[#2166f3]" /> Main St., Poblacion, Sibagat, Agusan del Sur</p><p className="flex gap-2"><Clock3 size={15} className="shrink-0 text-[#2166f3]" /> Office Hours: Monday to Saturday, 8:00 AM – 5:00 PM</p><p className="flex gap-2"><span className="text-[#2166f3]">☎</span> Hotline: (085) 815-2026 / 09091423431</p></div>
              </div>}

              <form onSubmit={(event) => { event.preventDefault(); payment.mutate(); }} className="mt-5 space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2447b6]">Upload {method === 'GCash' ? 'GCash payment receipt / screenshot' : 'cash / official receipt (OR)'} *
                  {receiptFile ? (
                    <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 normal-case tracking-normal">
                      <img src={receiptPreview} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-800">{receiptFile.name}</span>
                        <span className="mt-1 block text-[11px] font-normal text-slate-400">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        <label htmlFor="receipt-upload" className="mt-1 block cursor-pointer text-xs font-semibold text-[#2166f3]">Change Image</label>
                      </span>
                      <button type="button" onClick={removeReceipt} aria-label="Remove uploaded image" className="shrink-0 p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                      <input id="receipt-upload" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => handleReceiptChange(event.target.files?.[0])} />
                    </span>
                  ) : (
                    <span className="mt-2 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center normal-case tracking-normal">
                      <Upload size={22} className="mb-2 text-[#2166f3]" />
                      <span className="text-xs font-semibold text-slate-700">Tap or drag &amp; drop to upload {method === 'GCash' ? 'GCash receipt screenshot' : 'Cash / Official Receipt photo'}</span>
                      <span className="mt-2 text-[11px] font-normal text-slate-400">Supports PNG, JPG, or WebP (max 8MB)</span>
                      <input id="receipt-upload" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => handleReceiptChange(event.target.files?.[0])} />
                    </span>
                  )}
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#2447b6]">{method === 'GCash' ? 'Reference / transaction number' : 'Official receipt (OR) number'} *
                  <input required value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} placeholder={method === 'GCash' ? 'e.g. 1002938472910 (13-digit GCash Ref)' : 'e.g. OR-2026-9482 (Office Receipt No.)'} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-xs font-normal tracking-normal outline-none focus:border-[#2f68e6]" />
                </label>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-[#2447b6]"><Info className="mr-2 inline-block" size={15} />Once submitted, the admin will verify your receipt and reference number. Upon admin confirmation, your due bill will automatically be cleared.</div>
                {payment.error && <p className="text-sm font-semibold text-red-600">{(payment.error as Error).message}</p>}
                <button disabled={payment.isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f68e6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2258d1]">{payment.isPending && <Spinner />}{payment.isPending ? 'Submitting...' : `Submit ${method === 'GCash' ? 'GCash' : 'Cash'} Payment (₱${bill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })})`}</button>
              </form>
            </section> : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="border-b border-slate-100 pb-3 text-base font-bold text-slate-900">Subscription Overview</h2>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between gap-4 py-3"><span className="text-slate-400">Subscriber Name</span><strong>{account.data?.name || 'Loading...'}</strong></div>
                <div className="flex justify-between gap-4 py-3"><span className="text-slate-400">Account ID</span><strong className="rounded bg-blue-50 px-2 py-1 text-[#2166f3]">{account.data?.id || 'Loading...'}</strong></div>
                <div className="flex justify-between gap-4 py-3"><span className="text-slate-400">Internet Plan</span><strong>{account.data?.planName || 'Loading...'}</strong></div>
                <div className="flex justify-between gap-4 py-3"><span className="text-slate-400">Bandwidth Speed</span><strong className="text-emerald-600">{account.data?.speedMbps ? `${account.data.speedMbps} Mbps Pure Fiber` : 'Loading...'}</strong></div>
                <div className="flex justify-between gap-4 py-3"><span className="text-slate-400">Billing Cut-off</span><strong>Every 9th of Month</strong></div>
                <div className="flex justify-between gap-4 py-3"><span className="text-slate-400">Payment Due Date</span><strong>Every 30th of Month</strong></div>
              </div>
            </section>
          </> : null}
        </div>
      </main>
    </div>
  </PortalShell>;
}
