import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Equal, Minus, Plus, WalletCards } from "lucide-react";
import { boardApi } from "../services/desktopApi";
import { FinalProduct, ProductSale, ProductionJob, ProductionReport, Resource } from "../types";
import HistoricalAnalytics from "./HistoricalAnalytics";

interface Props { jobs: ProductionJob[]; products: FinalProduct[]; resources: Resource[]; reports: ProductionReport[]; setActiveTab: (tab: string) => void; }
const mdl = new Intl.NumberFormat("ro-MD", { style: "currency", currency: "MDL" });
const number = new Intl.NumberFormat("ro-MD", { maximumFractionDigits: 3 });
const PAGE_SIZE = 10;
type Period = 7 | 30 | 90 | "all";
const localToday = () => { const value = new Date(); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; };

export default function ProductionDashboard({ jobs, products, resources, reports, setActiveTab }: Props) {
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<Period>(30);
  const reloadSales = useCallback(() => void boardApi.productSales().then(setSales).catch(() => setSales([])), []);
  useEffect(() => {
    reloadSales();
    window.addEventListener("focus", reloadSales);
    return () => window.removeEventListener("focus", reloadSales);
  }, [reloadSales]);

  const endDate = useMemo(localToday, []);
  const startDate = useMemo(() => { if (period === "all") return ""; const date = new Date(`${endDate}T12:00:00`); date.setDate(date.getDate() - period + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }, [endDate, period]);
  const inPeriod = (date: string) => period === "all" || (date >= startDate && date <= endDate);
  const completed = useMemo(() => jobs.filter((job) => job.status === "completed" && inPeriod(job.date)), [jobs, period, startDate, endDate]);
  const filteredReports = useMemo(() => reports.filter((report) => inPeriod(report.date)), [reports, period, startDate, endDate]);
  const filteredSales = useMemo(() => sales.filter((sale) => inPeriod(sale.date)), [sales, period, startDate, endDate]);
  const figures = useMemo(() => {
    const serviceSales = completed.filter((job) => job.mode === "custom_processing").reduce((sum, job) => sum + job.totals.netReceivable, 0);
    const serviceCollected = completed.filter((job) => job.mode === "custom_processing").flatMap((job) => job.payments).filter((payment) => payment.status === "posted" && inPeriod(payment.date)).reduce((sum, payment) => sum + (payment.direction === "incoming" ? payment.amount : -payment.amount), 0);
    const productSales = filteredSales.reduce((sum, sale) => sum + sale.revenue, 0);
    const historical = filteredReports.filter((report) => report.status === "finalizat");
    const historicalSales = historical.reduce((sum, report) => sum + report.income, 0);
    const historicalCosts = historical.reduce((sum, report) => sum + report.calculatedTotalCostInput, 0);
    const currentCosts = completed.reduce((sum, job) => sum + job.totals.producerMaterialCost + job.totals.expenses, 0);
    const productionCosts = currentCosts + historicalCosts;
    return {
      serviceSales,
      productSales: productSales + historicalSales,
      currentProductSales: productSales,
      historicalSales,
      historicalCosts,
      currentCosts,
      sales: serviceSales + productSales + historicalSales,
      collected: serviceCollected,
      costs: productionCosts,
      result: serviceSales + productSales + historicalSales - productionCosts,
      toCollect: serviceSales - serviceCollected,
      produced: completed.filter((job) => job.mode === "own_production").reduce((sum, job) => sum + (job.outputQty || 0), 0) + historical.reduce((sum, report) => sum + report.outputQty, 0),
    };
  }, [completed, filteredReports, filteredSales]);

  const transactions = useMemo(() => [
    ...completed.flatMap((job) => {
      const cost = job.totals.producerMaterialCost + job.totals.expenses;
      const rows = cost > 0 ? [{ id: `production-${job.id}`, date: job.date, label: job.name, kind: "Cheltuială producție", amount: -cost }] : [];
      if (job.mode === "custom_processing" && job.totals.netReceivable > 0) rows.push({ id: `service-${job.id}`, date: job.date, label: job.name, kind: "Serviciu vândut", amount: job.totals.netReceivable });
      return rows;
    }),
    ...completed.filter((job) => job.mode === "custom_processing").flatMap((job) => job.payments.filter((payment) => payment.status === "posted").map((payment) => ({ id: `payment-${payment.id}`, date: payment.date, label: job.name, kind: payment.direction === "incoming" ? "Plată primită" : "Bani restituiți", amount: 0, displayAmount: payment.direction === "incoming" ? payment.amount : -payment.amount, informational: true }))),
    ...filteredSales.map((sale) => ({ id: `sale-${sale.id}`, date: sale.date, label: `${sale.productLabel} · ${number.format(Math.abs(sale.quantity))} kg`, kind: sale.entryType === "return" ? sale.returnKind === "damaged" ? "Retur Brac" : "Retur produs" : "Vânzare produs", amount: sale.revenue })),
    ...filteredReports.filter((report) => report.status === "finalizat").flatMap((report) => {
      const product = products.find((item) => item.id === report.productId);
      const label = `${product?.label || report.name} · ${number.format(report.outputQty)} kg (istoric)`;
      return [
        { id: `historical-cost-${report.id}`, date: report.date, label, kind: "Cost producție istorică", amount: -report.calculatedTotalCostInput },
        { id: `historical-sale-${report.id}`, date: report.date, label, kind: "Vânzare istorică", amount: report.income },
      ];
    }),
  ].filter((row) => inPeriod(row.date)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [completed, products, filteredReports, filteredSales, period, startDate, endDate]);
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const visibleTransactions = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  return <div className="space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-500">Pe scurt</p><h2 className="text-3xl font-bold">Cum stă afacerea</h2></div><button onClick={() => setActiveTab("loturi_productie")} className="rounded bg-amber-600 px-4 py-2 font-bold text-stone-950">Vezi loturile <ArrowRight className="ml-2 inline h-4 w-4" /></button></div>

    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-700/30 bg-stone-900 p-4"><div><p className="font-bold">Perioada afișată pe toată pagina</p><p className="text-sm text-stone-500">{period === "all" ? "Toate datele disponibile" : `${startDate} – ${endDate} (raportat la ziua de azi)`}</p></div><div className="flex rounded-lg border border-stone-800 bg-stone-950 p-1">{([{ value: 7, label: "7 zile" }, { value: 30, label: "Ultima lună" }, { value: 90, label: "3 luni" }, { value: "all", label: "Toate" }] as const).map((item) => <button type="button" key={item.value} onClick={() => { setPeriod(item.value); setPage(1); }} className={`rounded-md px-4 py-2 text-sm ${period === item.value ? "bg-amber-600 font-bold text-stone-950" : "text-stone-400 hover:text-stone-200"}`}>{item.label}</button>)}</div></div>

    <div className="rounded-xl border border-stone-800 bg-stone-900 p-5"><h3 className="mb-4 text-lg font-bold">Calculul principal</h3><div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
      <div className="rounded-xl bg-emerald-950/30 p-5"><p className="font-semibold">Total vânzări</p><p className="mt-2 text-3xl font-bold text-emerald-500">{mdl.format(figures.sales)}</p><small className="text-stone-500">Produse + servicii vândute</small></div>
      <div className="flex items-center justify-center"><Minus className="h-8 w-8 text-red-500" /></div>
      <div className="rounded-xl bg-red-950/30 p-5"><p className="font-semibold">Total cheltuit</p><p className="mt-2 text-3xl font-bold text-red-500">{mdl.format(figures.costs)}</p><small className="block text-stone-500">Materialele și cheltuielile producției</small><small className="text-stone-500">Noi: {mdl.format(figures.currentCosts)} · Istorice: {mdl.format(figures.historicalCosts)}</small></div>
      <div className="flex items-center justify-center"><Equal className="h-8 w-8" /></div>
      <div className="rounded-xl bg-stone-950/60 p-5"><p className="font-semibold">Ce rămâne</p><p className={`mt-2 text-3xl font-bold ${figures.result >= 0 ? "text-emerald-500" : "text-red-500"}`}>{mdl.format(figures.result)}</p><small className="text-stone-500">Vânzări minus cheltuieli</small></div>
    </div></div>

    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-stone-800 bg-stone-900 p-5"><h3 className="font-bold">Din ce sunt formate vânzările</h3><div className="mt-5 grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]"><div className="min-w-0"><small className="block h-5 text-stone-500">Servicii vândute</small><b className="block whitespace-nowrap text-xl leading-8">{mdl.format(figures.serviceSales)}</b></div><Plus className="mt-7 h-6 w-6 shrink-0" /><div className="min-w-0"><small className="block h-5 text-stone-500">Produse vândute</small><b className="block whitespace-nowrap text-xl leading-8">{mdl.format(figures.productSales)}</b><small className="mt-2 block leading-5 text-stone-500">Noi: {mdl.format(figures.currentProductSales)}<br />Istorice: {mdl.format(figures.historicalSales)}</small></div><Equal className="mt-7 h-6 w-6 shrink-0" /><div className="min-w-0"><small className="block h-5 text-stone-500">Total vânzări</small><b className="block whitespace-nowrap text-xl leading-8 text-emerald-500">{mdl.format(figures.sales)}</b></div></div></div>
      <div className="rounded-xl border border-stone-800 bg-stone-900 p-5"><h3 className="font-bold">Cum stau plățile pentru servicii</h3><div className="mt-5 grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]"><div className="min-w-0"><small className="block h-5 text-stone-500">Deja încasat</small><b className="block whitespace-nowrap text-xl leading-8 text-emerald-500">{mdl.format(figures.collected)}</b></div><Plus className="mt-7 h-6 w-6 shrink-0" /><div className="min-w-0"><small className="block h-5 text-stone-500">Mai trebuie încasat</small><b className="block whitespace-nowrap text-xl leading-8 text-amber-500">{mdl.format(figures.toCollect)}</b></div><Equal className="mt-7 h-6 w-6 shrink-0" /><div className="min-w-0"><small className="block h-5 text-stone-500">Servicii vândute</small><b className="block whitespace-nowrap text-xl leading-8">{mdl.format(figures.serviceSales)}</b></div></div><p className="mt-5 border-t border-stone-800 pt-3 text-xs leading-5 text-stone-500">Încasarea achită serviciul vândut; nu este o vânzare nouă și nu se adună din nou la profit.</p></div>
    </div>

    <div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl bg-stone-900 p-5"><p className="font-semibold">Produse făcute în perioadă</p><p className="mt-1 text-2xl font-bold">{number.format(figures.produced)} kg</p><small className="text-stone-500">Producție proprie închisă în perioada selectată</small></div><div className="rounded-xl bg-stone-900 p-5"><p className="font-semibold">Produse rămase în stoc acum</p><p className="mt-1 text-2xl font-bold">{number.format(products.reduce((sum, product) => sum + product.stock, 0))} kg</p><small className="text-stone-500">Soldul actual; nu este o valoare istorică a perioadei</small></div></div>

    <div className="rounded-xl border border-stone-800 bg-stone-900 p-5"><h3 className="mb-1 font-bold">Ce trebuie completat în stoc acum</h3><p className="mb-4 text-xs text-stone-500">Listă operațională la zi; nu se recalculează pentru perioade istorice.</p><div className="grid gap-2 sm:grid-cols-2">{resources.filter((resource) => resource.stock <= 5).slice(0, 8).map((resource) => <div key={resource.id} className="flex justify-between rounded bg-stone-950 p-3"><span>{resource.label}</span><b className="text-amber-500">{number.format(resource.stock)} {resource.unit}</b></div>)}</div></div>

    <HistoricalAnalytics reports={filteredReports} jobs={completed} />

    <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-900"><div className="flex flex-wrap items-center justify-between gap-3 p-5"><div><h3 className="flex items-center gap-2 text-lg font-bold"><WalletCards className="text-amber-500" />Lista tuturor operațiunilor</h3><p className="text-sm text-stone-500">Vânzările și costurile formează rezultatul. Plățile sunt afișate pentru control, dar nu se adună din nou.</p></div><div className="text-right"><small className="text-stone-500">Rezultat pe toate înregistrările</small><p className={`text-xl font-bold ${figures.result >= 0 ? "text-emerald-500" : "text-red-500"}`}>{figures.result >= 0 ? "+ " : "− "}{mdl.format(Math.abs(figures.result))}</p></div></div>
      <table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-stone-950 text-stone-500"><tr><th className="p-3">Data</th><th>Ce s-a întâmplat</th><th>Tip</th><th>Intră în rezultat?</th><th className="pr-4 text-right">Sumă</th></tr></thead><tbody>{visibleTransactions.map((row) => { const shown = "displayAmount" in row ? row.displayAmount : row.amount; const informational = "informational" in row && row.informational; return <tr key={row.id} className="border-t border-stone-800"><td className="p-3">{row.date}</td><td className="font-semibold">{row.label}</td><td>{row.kind}</td><td>{informational ? <span className="text-stone-500">Nu — este plata vânzării</span> : <span className="font-bold text-emerald-500">Da</span>}</td><td className={`pr-4 text-right text-base font-bold ${shown >= 0 ? "text-emerald-500" : "text-red-500"}`}>{shown >= 0 ? <Plus className="mr-1 inline h-4 w-4" /> : <Minus className="mr-1 inline h-4 w-4" />}{mdl.format(Math.abs(shown))}</td></tr>; })}</tbody></table>
      {!transactions.length && <p className="p-8 text-center text-stone-500">Nu există încă înregistrări.</p>}
      {transactions.length > 0 && <div className="flex items-center justify-between border-t border-stone-800 p-4"><span className="text-sm text-stone-500">Se afișează {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, transactions.length)} din {transactions.length}</span><div className="flex items-center gap-3"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-stone-700 px-4 py-2 disabled:opacity-40">Înapoi</button><b>Pagina {page} din {totalPages}</b><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-stone-700 px-4 py-2 disabled:opacity-40">Înainte</button></div></div>}
    </div>
  </div>;
}
