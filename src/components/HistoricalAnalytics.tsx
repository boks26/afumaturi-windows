import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, Grid3X3, TrendingUp } from "lucide-react";
import { ProductionJob, ProductionReport } from "../types";

type Row = { id: string; name: string; date: string; type: string; quantity: number; income: number; cost: number; result: number };
const money = new Intl.NumberFormat("ro-MD", { style: "currency", currency: "MDL" });
const number = new Intl.NumberFormat("ro-MD", { maximumFractionDigits: 2 });

export default function HistoricalAnalytics({ reports, jobs }: { reports: ProductionReport[]; jobs: ProductionJob[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const rows = useMemo<Row[]>(() => {
    const legacy = reports.filter((item) => item.status === "finalizat").map((item) => ({ id: `r-${item.id}`, name: item.name, date: item.date, type: "Raport vechi", quantity: item.outputQty, income: item.income, cost: item.calculatedTotalCostInput, result: item.profit }));
    const commercial = jobs.filter((item) => item.status === "completed").map((item) => {
      const cost = item.totals.producerMaterialCost + item.totals.expenses;
      const income = item.mode === "custom_processing" ? item.totals.netReceivable : 0;
      return { id: `j-${item.id}`, name: item.name, date: item.date, type: item.mode === "custom_processing" ? "Procesare client" : "Producție proprie", quantity: item.outputQty || 0, income, cost, result: item.mode === "custom_processing" ? item.totals.margin : -cost };
    });
    return [...legacy, ...commercial].sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, jobs]);
  const totals = useMemo(() => rows.reduce((sum, row) => ({ income: sum.income + row.income, cost: sum.cost + row.cost, result: sum.result + row.result }), { income: 0, cost: 0, result: 0 }), [rows]);
  const chart = useMemo(() => {
    const grouped = new Map<string, { date: string; income: number; cost: number; result: number }>();
    rows.forEach((row) => { const current = grouped.get(row.date) || { date: row.date, income: 0, cost: 0, result: 0 }; current.income += row.income; current.cost += row.cost; current.result += row.result; grouped.set(row.date, current); });
    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [rows]);
  const maxValue = Math.max(1, ...chart.flatMap((item) => [item.income, item.cost, Math.abs(item.result)]));

  return <section className="space-y-4 rounded-2xl border border-stone-800 bg-stone-900 p-5 shadow-sm">
    <div className="flex flex-col gap-4 border-b border-stone-800 pb-4 md:flex-row md:items-center md:justify-between">
      <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-500"><TrendingUp className="h-4 w-4" />Analiză istorică</p><h3 className="mt-1 text-xl font-bold">Evoluția producției pe perioade</h3><p className="text-xs text-stone-400">Rapoarte vechi și loturi comerciale finalizate.</p></div>
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-lg border border-stone-800 bg-stone-950 p-1"><button onClick={() => setView("chart")} title="Grafic" className={`rounded-md p-1.5 ${view === "chart" ? "bg-amber-600 text-stone-950" : "text-stone-400"}`}><BarChart3 className="h-4 w-4" /></button><button onClick={() => setView("table")} title="Tabel" className={`rounded-md p-1.5 ${view === "table" ? "bg-amber-600 text-stone-950" : "text-stone-400"}`}><Grid3X3 className="h-4 w-4" /></button></div>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">{[["Venit înregistrat", totals.income, "text-emerald-500"], ["Costuri", totals.cost, "text-red-400"], ["Rezultat", totals.result, totals.result >= 0 ? "text-emerald-500" : "text-red-400"]].map(([label, value, color]) => <div key={String(label)} className="rounded-xl bg-stone-950 p-4"><p className="text-xs text-stone-500">{label}</p><p className={`mt-1 text-xl font-bold ${color}`}>{money.format(Number(value))}</p></div>)}</div>
    {!rows.length ? <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-stone-800 text-center text-sm text-stone-500"><div><CalendarDays className="mx-auto mb-2 h-7 w-7" />Nu există loturi finalizate în perioada selectată.</div></div> : view === "chart" ? <div className="overflow-x-auto rounded-xl bg-stone-950 p-4"><svg viewBox={`0 0 ${Math.max(700, chart.length * 54)} 260`} className="h-64 min-w-[700px] w-full" role="img" aria-label="Grafic venituri, costuri și rezultat">
      {[30, 80, 130, 180, 230].map((y) => <line key={y} x1="35" y1={y} x2={Math.max(680, chart.length * 54 - 10)} y2={y} stroke="currentColor" className="text-stone-800" strokeDasharray="3 4" />)}
      {chart.map((item, index) => { const x = 50 + index * 54; const scale = 185 / maxValue; return <g key={item.date}><rect x={x} y={230 - item.income * scale} width="12" height={Math.max(1, item.income * scale)} rx="2" fill="#059669" /><rect x={x + 14} y={230 - item.cost * scale} width="12" height={Math.max(1, item.cost * scale)} rx="2" fill="#dc2626" /><rect x={x + 28} y={230 - Math.abs(item.result) * scale} width="12" height={Math.max(1, Math.abs(item.result) * scale)} rx="2" fill={item.result >= 0 ? "#d97706" : "#7f1d1d"} /><text x={x + 20} y="248" textAnchor="middle" className="fill-stone-500 text-[8px]">{item.date.slice(5)}</text></g>; })}
    </svg><div className="flex justify-center gap-5 text-xs text-stone-400"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" />Venit</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-600" />Cost</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-600" />Rezultat</span></div></div> : <div className="overflow-x-auto rounded-xl border border-stone-800"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-stone-950 text-stone-500"><tr><th className="p-3">Lot</th><th>Tip</th><th>Data</th><th className="text-right">Cantitate</th><th className="text-right">Venit</th><th className="text-right">Cost</th><th className="pr-3 text-right">Rezultat</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-stone-800"><td className="p-3 font-semibold">{row.name}</td><td className="text-stone-400">{row.type}</td><td className="font-mono text-stone-400">{row.date}</td><td className="text-right">{number.format(row.quantity)}</td><td className="text-right text-emerald-500">{money.format(row.income)}</td><td className="text-right text-red-400">{money.format(row.cost)}</td><td className={`pr-3 text-right font-bold ${row.result >= 0 ? "text-emerald-500" : "text-red-400"}`}>{money.format(row.result)}</td></tr>)}</tbody></table></div>}
  </section>;
}
