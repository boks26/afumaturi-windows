import { useMemo } from "react";
import { ArrowRight, Factory, HandCoins, Package, Scale } from "lucide-react";
import { FinalProduct, ProductionJob, Resource } from "../types";

interface Props {
  jobs: ProductionJob[];
  products: FinalProduct[];
  resources: Resource[];
  setActiveTab: (tab: string) => void;
}
const mdl = new Intl.NumberFormat("ro-MD", {
  style: "currency",
  currency: "MDL",
});
const number = new Intl.NumberFormat("ro-MD", { maximumFractionDigits: 3 });

export default function ProductionDashboard({
  jobs,
  products,
  resources,
  setActiveTab,
}: Props) {
  const metrics = useMemo(() => {
    const completed = jobs.filter((job) => job.status === "completed");
    const own = completed.filter((job) => job.mode === "own_production");
    const custom = completed.filter((job) => job.mode === "custom_processing");
    return {
      ownCost: own.reduce(
        (sum, job) =>
          sum + job.totals.producerMaterialCost + job.totals.expenses,
        0,
      ),
      ownQuantity: own.reduce((sum, job) => sum + (job.outputQty || 0), 0),
      serviceRevenue: custom.reduce(
        (sum, job) => sum + job.totals.netReceivable,
        0,
      ),
      serviceExpenses: custom.reduce(
        (sum, job) =>
          sum + job.totals.expenses + job.totals.producerMaterialCost,
        0,
      ),
      serviceMargin: custom.reduce((sum, job) => sum + job.totals.margin, 0),
      receivables: custom.reduce((sum, job) => sum + job.totals.balance, 0),
    };
  }, [jobs]);
  const cards = [
    {
      label: "Cost producție proprie",
      value: mdl.format(metrics.ownCost),
      icon: Factory,
    },
    {
      label: "Cantitate produsă",
      value: `${number.format(metrics.ownQuantity)} kg`,
      icon: Scale,
    },
    {
      label: "Venit servicii",
      value: mdl.format(metrics.serviceRevenue),
      icon: HandCoins,
    },
    {
      label: "Marjă servicii",
      value: mdl.format(metrics.serviceMargin),
      icon: Package,
    },
  ];
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500">
            Imagine de ansamblu
          </p>
          <h2 className="text-3xl font-bold">Producție și procesare</h2>
        </div>
        <button
          onClick={() => setActiveTab("loturi_productie")}
          className="rounded bg-amber-600 px-4 py-2 font-bold text-stone-950"
        >
          Vezi loturile <ArrowRight className="ml-2 inline h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-stone-800 bg-stone-900 p-5"
          >
            <Icon className="mb-4 h-6 w-6 text-amber-500" />
            <p className="text-xs text-stone-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-stone-900 p-5">
          <p className="text-sm text-stone-400">Cheltuieli procesare</p>
          <p className="text-xl font-bold">
            {mdl.format(metrics.serviceExpenses)}
          </p>
        </div>
        <div className="rounded-xl bg-stone-900 p-5">
          <p className="text-sm text-stone-400">Creanțe servicii</p>
          <p className="text-xl font-bold text-amber-500">
            {mdl.format(metrics.receivables)}
          </p>
        </div>
        <div className="rounded-xl bg-stone-900 p-5">
          <p className="text-sm text-stone-400">Stoc produse proprii</p>
          <p className="text-xl font-bold">
            {number.format(products.reduce((sum, p) => sum + p.stock, 0))} kg
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-stone-800 bg-stone-900 p-5">
        <h3 className="mb-4 font-bold">Stocuri joase</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {resources
            .filter((r) => r.stock <= 5)
            .slice(0, 8)
            .map((r) => (
              <div
                key={r.id}
                className="flex justify-between rounded bg-stone-950 p-3"
              >
                <span>{r.label}</span>
                <b className="text-amber-500">
                  {number.format(r.stock)} {r.unit}
                </b>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
