import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PackageMinus, Plus, RotateCcw, ShoppingCart, X } from "lucide-react";
import { FinalProduct, ProductSale, ProductSalePreview } from "../types";
import { boardApi } from "../services/desktopApi";
import ProductReturnModal from "./ProductReturnModal";

const mdl = new Intl.NumberFormat("ro-MD", { style: "currency", currency: "MDL" });
const num = new Intl.NumberFormat("ro-MD", { maximumFractionDigits: 3 });
const today = () => new Date().toISOString().slice(0, 10);

export default function ProductSalesManager({ products, onChanged, onError }: { products: FinalProduct[]; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<ProductSalePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);

  const resetForm = (nextProductId = products[0]?.id || "") => {
    const nextProduct = products.find((item) => item.id === nextProductId);
    setProductId(nextProductId);
    setQuantity(1);
    setPrice(Number(nextProduct?.suggestedPrice || 0));
    setDate(today());
    setNote("");
    setPreview(null);
  };
  const openForm = () => { resetForm(); setShowForm(true); };
  const closeForm = () => { setShowForm(false); resetForm(); };

  const reloadSales = useCallback(() => void boardApi.productSales().then(setSales).catch((error: Error) => onError(error.message)), [onError]);
  useEffect(() => {
    reloadSales();
    window.addEventListener("focus", reloadSales);
    return () => window.removeEventListener("focus", reloadSales);
  }, [reloadSales]);
  useEffect(() => {
    if (!showForm || !productId || quantity <= 0) { setPreview(null); return; }
    const timer = setTimeout(() => void boardApi.productSalePreview(productId, quantity).then(setPreview).catch((error: Error) => onError(error.message)), 250);
    return () => clearTimeout(timer);
  }, [showForm, productId, quantity]);

  const selectProduct = (id: string) => {
    const selected = products.find((item) => item.id === id);
    setProductId(id);
    setPrice(Number(selected?.suggestedPrice || 0));
  };
  const revenue = quantity * price;
  const profit = revenue - (preview?.fifoCost || 0);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      await boardApi.createProductSale({ productId, date, quantity, unitPrice: price, note });
      setSales(await boardApi.productSales());
      await onChanged();
      closeForm();
    } catch (error) { onError(error instanceof Error ? error.message : "Vânzarea nu a putut fi salvată."); }
    finally { setBusy(false); }
  };
  const submitReturn = async (saleId: string, data: { date: string; quantity: number; damaged: boolean; note?: string }) => {
    await boardApi.returnProductSale(saleId, data);
    setSales(await boardApi.productSales());
    await onChanged();
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-800 bg-stone-900 p-5">
      <div><h2 className="flex items-center gap-2 text-2xl font-bold"><ShoppingCart className="text-amber-500" />Vânzări produse finite</h2><p className="mt-1 text-sm text-stone-400">Istoricul vânzărilor și scăderea FIFO din stoc.</p></div>
      <div className="flex gap-3"><button type="button" onClick={() => setShowReturn(true)} disabled={!sales.some((sale) => (sale.entryType || "sale") === "sale" && sale.quantity - (sale.returnedQuantity || 0) > 0)} className="flex h-12 items-center gap-2 rounded-lg border border-amber-700 px-5 font-bold text-amber-500 disabled:opacity-40"><RotateCcw className="h-5 w-5" />Retur</button><button type="button" onClick={openForm} disabled={!products.length} className="flex h-12 items-center gap-2 rounded-lg bg-amber-600 px-5 font-bold text-stone-950"><Plus className="h-5 w-5" />Vânzare nouă</button></div>
    </div>

    <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900"><h3 className="p-5 text-lg font-bold">Tabel vânzări și retururi</h3><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-stone-950 text-stone-500"><tr><th className="p-3">Data</th><th>Produs</th><th>Operațiune</th><th className="text-right">Cantitate</th><th className="text-right">Preț/kg</th><th className="text-right">Venit</th><th className="text-right">Cost FIFO</th><th className="pr-3 text-right">Rezultat</th></tr></thead><tbody>{sales.map((sale) => { const isReturn = sale.entryType === "return"; return <tr key={sale.id} className="border-t border-stone-800"><td className="p-3">{sale.date}</td><td className="font-semibold">{sale.productLabel}</td><td><span className={`rounded px-2 py-1 text-xs font-bold ${isReturn ? sale.returnKind === "damaged" ? "bg-red-950/40 text-red-400" : "bg-amber-950/40 text-amber-500" : "bg-emerald-950/40 text-emerald-500"}`}>{isReturn ? sale.returnKind === "damaged" ? "Retur Brac" : "Retur în stoc" : "Vânzare"}</span></td><td className="text-right">{num.format(sale.quantity)} kg</td><td className="text-right">{mdl.format(sale.unitPrice)}</td><td className={`text-right font-bold ${sale.revenue >= 0 ? "text-emerald-500" : "text-red-400"}`}>{sale.revenue >= 0 ? "+ " : "− "}{mdl.format(Math.abs(sale.revenue))}</td><td className="text-right">{sale.fifoCost === 0 ? "—" : `${sale.fifoCost > 0 ? "−" : "+"} ${mdl.format(Math.abs(sale.fifoCost))}`}</td><td className={`pr-3 text-right font-bold ${sale.profit >= 0 ? "text-emerald-500" : "text-red-400"}`}>{mdl.format(sale.profit)}</td></tr>; })}</tbody></table>{!sales.length && <p className="p-8 text-center text-stone-500">Nu există vânzări înregistrate.</p>}</div>

    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"><form onSubmit={submit} className="relative max-h-[94vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-xl border border-stone-700 bg-stone-900 p-6 shadow-2xl"><button type="button" aria-label="Închide" onClick={closeForm} className="absolute right-4 top-4 rounded p-2"><X /></button><h3 className="text-2xl font-bold">Vânzare nouă</h3>
      <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">Produs vândut<select required value={productId} onChange={(event) => selectProduct(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-base"><option value="">Selectați produsul</option>{products.map((item) => <option key={item.id} value={item.id}>{item.label} — stoc {num.format(item.stock)} kg</option>)}</select></label><label className="text-sm font-semibold">Data vânzării<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-base" /></label><label className="text-sm font-semibold">Cantitatea vândută (kg)<input required min="0.001" step="0.001" type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2 h-12 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-base" /></label><label className="text-sm font-semibold">Preț de vânzare / kg<input required min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} className="mt-2 h-12 w-full rounded-lg border border-amber-700 bg-stone-950 px-3 text-base" /><span className="mt-1 block text-xs text-stone-500">Recomandat: {mdl.format(product?.suggestedPrice || 0)}. Prețul poate fi modificat.</span></label></div>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Notă opțională" className="min-h-20 w-full rounded-lg border border-stone-700 bg-stone-950 p-3" />
      {preview && <div className="space-y-3 rounded-xl border border-amber-700/30 bg-stone-950/40 p-4"><h4 className="font-bold">Calcul FIFO înainte de salvare</h4><div className="grid gap-3 sm:grid-cols-4">{[["Stoc înainte", `${num.format(preview.stock)} kg`], ["Stoc după", `${num.format(preview.stockAfter)} kg`], ["Cost FIFO", mdl.format(preview.fifoCost)], ["Profit", mdl.format(profit)]].map(([label, value]) => <div key={label} className="rounded-lg bg-stone-900 p-3"><small className="text-stone-500">{label}</small><b className="mt-1 block text-lg">{value}</b></div>)}</div>{preview.allocations.map((allocation, index) => <div key={index} className="flex justify-between gap-2 border-t border-stone-800 pt-2 text-sm"><span>{allocation.provisional ? "Cantitate peste stoc" : `Lot ${allocation.date || "istoric"}`} · {num.format(allocation.quantity)} kg</span><b>{mdl.format(allocation.unitCost)}/kg · {mdl.format(allocation.totalCost)}</b></div>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><div><small className="text-stone-500">Total încasat</small><p className="text-2xl font-bold text-emerald-500">{mdl.format(revenue)}</p></div><div className="flex gap-3"><button type="button" onClick={closeForm} className="h-12 rounded-lg px-5 font-bold">Renunță</button><button disabled={busy || !productId} className="flex h-12 items-center gap-2 rounded-lg bg-amber-600 px-6 font-bold text-stone-950"><PackageMinus className="h-5 w-5" />{busy ? "Se salvează…" : "Înregistrează vânzarea"}</button></div></div>
    </form></div>}
    {showReturn && <ProductReturnModal sales={sales} onSubmit={submitReturn} onClose={() => setShowReturn(false)} />}
  </div>;
}
