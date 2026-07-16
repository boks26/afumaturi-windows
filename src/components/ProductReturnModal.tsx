import { useMemo, useState, type FormEvent } from "react";
import { RotateCcw, X } from "lucide-react";
import { ProductSale } from "../types";

const mdl = new Intl.NumberFormat("ro-MD", { style: "currency", currency: "MDL" });
const num = new Intl.NumberFormat("ro-MD", { maximumFractionDigits: 3 });
const today = () => new Date().toISOString().slice(0, 10);

export default function ProductReturnModal({ sales, onSubmit, onClose }: { sales: ProductSale[]; onSubmit: (saleId: string, data: { date: string; quantity: number; damaged: boolean; note?: string }) => Promise<void>; onClose: () => void }) {
  const available = useMemo(() => sales.filter((sale) => (sale.entryType || "sale") === "sale" && sale.quantity - (sale.returnedQuantity || 0) > 0.00001), [sales]);
  const [saleId, setSaleId] = useState(available[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(today());
  const [damaged, setDamaged] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sale = available.find((item) => item.id === saleId);
  const remaining = sale ? sale.quantity - (sale.returnedQuantity || 0) : 0;
  const refund = (sale?.unitPrice || 0) * quantity;
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { await onSubmit(saleId, { date, quantity, damaged, note }); onClose(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Returul nu a putut fi salvat."); } finally { setBusy(false); } };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-2xl space-y-5 rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="flex items-center gap-2 text-2xl font-bold"><RotateCcw className="text-amber-500" />Retur produs final</h3><p className="mt-1 text-sm text-stone-400">Alegeți vânzarea originală și cantitatea returnată.</p></div><button type="button" onClick={onClose} className="rounded p-2 hover:bg-stone-800" aria-label="Închide"><X /></button></div>
    <label className="block text-sm font-semibold">Vânzarea din care se face returul<select required value={saleId} onChange={(event) => { setSaleId(event.target.value); setQuantity(1); }} className="mt-2 h-12 w-full rounded-lg border border-stone-700 bg-stone-950 px-3">{available.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.productLabel} · {num.format(item.quantity)} kg · {mdl.format(item.unitPrice)}/kg</option>)}</select></label>
    {sale && <div className="grid gap-3 rounded-xl bg-stone-950/50 p-4 sm:grid-cols-3"><div><small className="text-stone-500">Se mai poate returna</small><b className="block text-lg">{num.format(remaining)} kg</b></div><div><small className="text-stone-500">Prețul original</small><b className="block text-lg">{mdl.format(sale.unitPrice)}/kg</b></div><div><small className="text-stone-500">Sumă restituită</small><b className="block text-lg text-red-400">− {mdl.format(refund)}</b></div></div>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Data returului<input required min={sale?.date} type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-stone-700 bg-stone-950 px-3" /></label><label className="text-sm font-semibold">Cantitate returnată (kg)<input required min="0.001" max={remaining} step="0.001" type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2 h-12 w-full rounded-lg border border-stone-700 bg-stone-950 px-3" /></label></div>
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${damaged ? "border-red-700 bg-red-950/20" : "border-stone-700"}`}><input type="checkbox" checked={damaged} onChange={(event) => setDamaged(event.target.checked)} className="mt-1 h-5 w-5" /><span><b>Brac — produs deteriorat</b><small className="mt-1 block text-stone-400">Produsul nu revine în stoc. Venitul se anulează, iar costul rămâne pierdere.</small></span></label>
    <label className="block text-sm font-semibold">Notă opțională<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Motivul returului" className="mt-2 min-h-20 w-full rounded-lg border border-stone-700 bg-stone-950 p-3" /></label>
    {error && <p className="rounded-lg bg-red-950/30 p-3 text-red-300">{error}</p>}{!available.length && <p className="rounded-lg bg-amber-950/30 p-3 text-amber-300">Nu există vânzări cu o cantitate disponibilă pentru retur.</p>}
    <div className="flex justify-end gap-3 border-t border-stone-800 pt-4"><button type="button" onClick={onClose} className="h-12 rounded-lg px-5 font-bold">Renunță</button><button disabled={busy || !saleId || quantity <= 0 || quantity > remaining} className="h-12 rounded-lg bg-amber-600 px-6 font-bold text-stone-950">{busy ? "Se salvează…" : damaged ? "Înregistrează returul Brac" : "Înregistrează returul"}</button></div></form></div>;
}
