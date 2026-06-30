import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  IndianRupee,
  Save,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { api } from '../lib/api';
import NurseCaregiverNav from '../components/NurseCaregiverNav.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
const fmtInr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );
const paymentStatusLabel = (s) => {
  if (s === 'paid_out') return { text: 'Paid to you', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  if (s === 'pending_settlement') return { text: 'Pending', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  if (s === 'refunded') return { text: 'Refunded', cls: 'bg-glass/40 text-muted border-glass-border/60' };
  return { text: s, cls: 'bg-glass/40 text-muted' };
};
const formatAcct = (raw) => {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 18);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};
const inputCls =
  'mt-0.5 w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-sm text-white placeholder:text-white/35 backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50';
const labelCls = 'text-[11px] font-medium text-white/75';
const NursePayment = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState({
    totalReceived: 0,
    pendingSettlement: 0,
    paymentCount: 0,
    completedCount: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [payoutMethod, setPayoutMethod] = useState('bank');
  const [payout, setPayout] = useState({
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    configured: false,
    accountNumberMasked: '',
  });
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/nurses/me/payments');
      setSummary(data.summary || {});
      setTransactions(data.transactions || []);
      const p = data.payout || {};
      setPayoutMethod(p.method === 'upi' ? 'upi' : 'bank');
      setPayout({
        accountHolder: p.accountHolder || '',
        bankName: p.bankName || '',
        accountNumber: '',
        ifsc: p.ifsc || '',
        upiId: p.upiId || '',
        configured: Boolean(p.configured),
        accountNumberMasked: p.accountNumberMasked || '',
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load payments');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const savePayout = async () => {
    setSaving(true);
    try {
      const payload =
        payoutMethod === 'bank'
          ? {
              payoutMethod: 'bank',
              payoutAccountHolder: payout.accountHolder,
              payoutBankName: payout.bankName,
              payoutAccountNumber: payout.accountNumber.replace(/\s/g, ''),
              payoutIfsc: payout.ifsc,
            }
          : {
              payoutMethod: 'upi',
              payoutUpiId: payout.upiId,
              payoutAccountHolder: payout.accountHolder,
            };
      const { data } = await api.patch('/nurses/me/payout', payload);
      setPayout((prev) => ({
        ...prev,
        configured: data.payout?.configured,
        accountNumberMasked: data.payout?.accountNumberMasked || prev.accountNumberMasked,
        accountNumber: '',
      }));
      toast.success('Payout account saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };
  const tabBtn = (id, label, Icon) => (
    <button
      type="button"
      onClick={() => setPayoutMethod(id)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold border transition-all ${
        payoutMethod === id
          ? 'border-brand-500 bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/20'
          : 'border-glass-border/60 bg-glass/30 text-muted hover:border-brand-500/40'
      }`}
    >
      <Icon className="w-4 h-4" strokeWidth={2} />
      {label}
    </button>
  );
  return (
    <div className="app-page page-shell-wide">
      <div className="dashboard-layout">
        <NurseCaregiverNav activeId="payment" />
        <div className="dashboard-main space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Payments</h1>
            <p className="text-xs text-muted mt-0.5">
              Track what patients paid and where your earnings are sent.
            </p>
          </div>
          {loading ? (
            <div className="card py-8 text-center text-muted text-sm">Loading payment data…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-semibold uppercase tracking-wide">
                    <IndianRupee className="w-3.5 h-3.5" />
                    Total received
                  </div>
                  <div className="text-xl font-bold text-emerald-300 mt-1 tabular-nums">
                    {fmtInr(summary.totalReceived)}
                  </div>
                  <p className="text-[10px] text-emerald-400/80">{summary.completedCount} completed visits</p>
                </div>
                <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3">
                  <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-semibold uppercase tracking-wide">
                    <Clock className="w-3.5 h-3.5" />
                    Pending settlement
                  </div>
                  <div className="text-xl font-bold text-amber-300 mt-1 tabular-nums">
                    {fmtInr(summary.pendingSettlement)}
                  </div>
                  <p className="text-[10px] text-amber-400/80">Paid, visit not completed</p>
                </div>
                <div className="rounded-xl border border-brand-500/35 bg-brand-500/10 p-3">
                  <div className="flex items-center gap-1.5 text-brand-400 text-[10px] font-semibold uppercase tracking-wide">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Payments
                  </div>
                  <div className="text-xl font-bold text-brand-300 mt-1 tabular-nums">{summary.paymentCount}</div>
                  <p className="text-[10px] text-brand-400/80">Bookings with payment</p>
                </div>
              </div>
              <div className="grid lg:grid-cols-5 gap-4 items-stretch">
                <section className="lg:col-span-3 rounded-2xl border border-white/10 bg-slate-950/35 shadow-glass overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/10 bg-white/[0.04]">
                    <h2 className="text-sm font-semibold text-white">Payment history</h2>
                    <p className="text-[11px] text-white/55">Amount paid by each patient</p>
                  </div>
                  <div className="overflow-x-auto max-h-[min(20rem,calc(100vh-17rem))] overflow-y-auto">
                    {transactions.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-muted">No paid bookings yet.</p>
                    ) : (
                      <table className="w-full text-sm min-w-[480px]">
                        <thead className="bg-white/[0.04] text-left text-[10px] font-semibold text-white/50 uppercase tracking-wide">
                          <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Patient</th>
                            <th className="px-3 py-2">Service</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((r) => {
                            const ps = paymentStatusLabel(r.paymentStatus);
                            return (
                              <tr key={r._id} className="border-t border-white/10 hover:bg-white/[0.05] transition-colors">
                                <td className="px-3 py-2 text-white/60 whitespace-nowrap tabular-nums">
                                  {r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-3 py-2 font-medium text-white">
                                  {typeof r.user === 'object' ? r.user?.name : 'Patient'}
                                </td>
                                <td className="px-3 py-2 capitalize text-white/65">
                                  {r.serviceType?.replace(/_/g, ' ')}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold tabular-nums text-white">
                                  {fmtInr(r.feeAmount)}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span
                                      className={`inline-flex text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${ps.cls}`}
                                    >
                                      {ps.text}
                                    </span>
                                    <StatusBadge status={r.status} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>
                <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-950/35 shadow-glass overflow-hidden flex flex-col">
                  <div className="bg-white/[0.04] border-b border-white/10 px-4 py-2.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-white/80 text-[10px] font-medium uppercase tracking-wide">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Payout account
                    </div>
                    <p className="text-white/65 text-xs mt-0.5">Where you receive completed job payments</p>
                  </div>
                  <div className="p-3 space-y-2.5">
                    {payout.configured && (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 text-[11px] text-emerald-300">
                        <span className="font-semibold">Active payout: </span>
                        {payoutMethod === 'bank' ? (
                          <>
                            {payout.bankName || 'Bank'} · {payout.accountNumberMasked || 'Account on file'}
                            {payout.ifsc ? ` · ${payout.ifsc}` : ''}
                          </>
                        ) : (
                          <>UPI {payout.upiId}</>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {tabBtn('bank', 'Bank account', Building2)}
                      {tabBtn('upi', 'UPI', Smartphone)}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      {payoutMethod === 'bank' ? (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                          <div className="col-span-2">
                            <label className={labelCls}>Account holder name</label>
                            <input
                              className={inputCls}
                              value={payout.accountHolder}
                              onChange={(e) => setPayout((p) => ({ ...p, accountHolder: e.target.value }))}
                              placeholder="As per bank records"
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Bank name</label>
                            <input
                              className={inputCls}
                              value={payout.bankName}
                              onChange={(e) => setPayout((p) => ({ ...p, bankName: e.target.value }))}
                              placeholder="HDFC Bank"
                            />
                          </div>
                          <div>
                            <label className={labelCls}>IFSC code</label>
                            <input
                              className={`${inputCls} font-mono uppercase`}
                              value={payout.ifsc}
                              onChange={(e) => setPayout((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                              placeholder="HDFC0001234"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className={labelCls}>Account number</label>
                            <input
                              className={`${inputCls} font-mono tracking-wide`}
                              inputMode="numeric"
                              value={payout.accountNumber}
                              onChange={(e) =>
                                setPayout((p) => ({ ...p, accountNumber: formatAcct(e.target.value) }))
                              }
                              placeholder={payout.accountNumberMasked || 'Enter account number'}
                            />
                          </div>
                          <p className="col-span-2 flex items-center gap-2 text-[10px] text-white/45 leading-snug">
                            <CreditCard className="w-4 h-4 text-white/35 shrink-0" strokeWidth={1.5} />
                            Demo payouts after each completed visit.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                          <div>
                            <label className={labelCls}>Account holder (optional)</label>
                            <input
                              className={inputCls}
                              value={payout.accountHolder}
                              onChange={(e) => setPayout((p) => ({ ...p, accountHolder: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>UPI ID</label>
                            <input
                              className={inputCls}
                              value={payout.upiId}
                              onChange={(e) => setPayout((p) => ({ ...p, upiId: e.target.value.toLowerCase() }))}
                              placeholder="name@oksbi"
                            />
                          </div>
                          <div className="col-span-2 flex flex-wrap gap-1.5">
                            {['Google Pay', 'PhonePe', 'Paytm'].map((app) => (
                              <span
                                key={app}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/65"
                              >
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="w-full btn-primary py-2 text-sm font-bold"
                      disabled={saving}
                      onClick={savePayout}
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving…' : 'Save payout details'}
                    </button>
                    <p className="text-[9px] text-white/35 text-center">Demo storage · no real money movement</p>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default NursePayment;
