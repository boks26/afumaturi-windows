import React, { useEffect, useMemo, useState } from "react";
import { Beef, CheckCircle, Coins, Eye, Factory, Play, Plus, Sprout, Trash2, Users } from "lucide-react";
import {
  FinalProduct,
  Employee,
  JobChargeInput,
  PaymentInput,
  Party,
  PricingBasis,
  ProductionJob,
  ProductionJobInput,
  ProductionMode,
  Recipe,
  Resource,
  SubrecipeStock,
} from "../types";
import { boardApi, paymentApi, productionJobApi } from "../services/desktopApi";
import { scaleRecipeIngredients } from "../utils/calculations";

interface Props {
  jobs: ProductionJob[];
  parties: Party[];
  products: FinalProduct[];
  recipes: Recipe[];
  resources: Resource[];
  employees: Employee[];
  onChanged: (reloadStock?: boolean) => Promise<void>;
  onError: (message: string) => void;
}
const money = new Intl.NumberFormat("ro-MD", {
  style: "currency",
  currency: "MDL",
});
const qty = new Intl.NumberFormat("ro-MD", { maximumFractionDigits: 4 });
const initial = (): ProductionJobInput => ({
  name: "",
  date: new Date().toISOString().slice(0, 10),
  mode: "own_production",
  productId: "",
  recipeId: "",
  inputQty: 0,
  outputQty: null,
  unit: "kg",
  pricingBasis: null,
  processingRate: null,
  ownershipOverrides: [],
  charges: [],
  notes: "",
});

export default function ProductionJobsManager({
  jobs,
  parties,
  products,
  recipes,
  resources,
  employees,
  onChanged,
  onError,
}: Props) {
  const [form, setForm] = useState(initial());
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ProductionJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [subrecipeStocks, setSubrecipeStocks] = useState<SubrecipeStock[]>([]);
  const [mode, setMode] = useState<ProductionMode | "">("");
  const [status, setStatus] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [charge, setCharge] = useState<JobChargeInput>({
    type: "other",
    description: "",
    amount: 0,
    direction: "expense",
  });
  const [jobPayment, setJobPayment] = useState({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    method: "cash" as PaymentInput["method"],
  });
  const customers = parties.filter(
    (p) => p.active && p.roles.includes("customer"),
  );
  const visible = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (!mode || j.mode === mode) &&
          (!status || j.status === status) &&
          (!partyFilter || j.partyId === partyFilter) &&
          (!search || j.name.toLowerCase().includes(search.toLowerCase())) &&
          (!dateFrom || j.date >= dateFrom) &&
          (!dateTo || j.date <= dateTo),
      ),
    [jobs, mode, status, partyFilter, search, dateFrom, dateTo],
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId),
    [products, form.productId],
  );
  const recipesForProduct = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return [];
    return recipes.filter((recipe) => !recipe.isSubRecipe && (recipe.id === product.recipeId || recipe.productId === product.id));
  };
  const eligibleProducts = useMemo(
    () => products.filter((product) => recipesForProduct(product.id).length > 0),
    [products, recipes],
  );
  const availableRecipes = useMemo(
    () => recipesForProduct(form.productId),
    [form.productId, products, recipes],
  );
  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === form.recipeId),
    [recipes, form.recipeId],
  );
  const recipePreview = useMemo(
    () => form.recipeId && form.inputQty > 0
      ? scaleRecipeIngredients(form.recipeId, form.inputQty, recipes, resources, employees)
      : null,
    [form.recipeId, form.inputQty, recipes, resources, employees],
  );

  useEffect(() => {
    if (!selectedProduct || !form.inputQty || !form.date) return;
    const displayDate = form.date.split("-").reverse().join(".");
    const generatedName = `${selectedProduct.label} - ${qty.format(form.inputQty)} ${selectedRecipe?.baseUnit || form.unit} - ${displayDate}`;
    if (form.name !== generatedName) {
      setForm((current) => ({ ...current, name: generatedName }));
    }
  }, [selectedProduct, selectedRecipe, form.inputQty, form.date, form.unit, form.name]);

  useEffect(() => {
    if (form.mode !== "custom_processing" || !recipePreview) return;
    const resourceIds = [...new Set([
      ...recipePreview.materiePrima,
      ...recipePreview.condimente,
      ...recipePreview.condimenteRecete,
    ].map((item) => item.resourceId))];
    setForm((current) => ({
      ...current,
      ownershipOverrides: resourceIds.map((resourceId) => ({
        resourceId,
        ownership: "customer" as const,
        suppliedByPartyId: current.partyId,
      })),
    }));
  }, [form.mode, form.partyId, recipePreview]);
  const serviceAmount =
    form.mode === "custom_processing"
      ? form.pricingBasis === "fixed"
        ? Number(form.processingRate || 0)
        : Number(
            form.pricingBasis === "output_qty"
              ? form.outputQty || 0
              : form.inputQty,
          ) * Number(form.processingRate || 0)
      : 0;
  const openCreate = async () => {
    setForm(initial());
    setOpen(true);
    try { setSubrecipeStocks(await boardApi.subrecipeStocks()); }
    catch (error) { onError(error instanceof Error ? error.message : "Stocul subrețetelor nu a putut fi încărcat."); }
  };
  const produceSubrecipe = async (recipeId: string, suggestedQuantity: number) => {
    const entered = prompt("Cantitatea nouă produsă:", String(suggestedQuantity));
    if (entered === null) return;
    const amount = Number(entered);
    if (!Number.isFinite(amount) || amount <= 0) { onError("Cantitatea trebuie să fie pozitivă."); return; }
    setBusy(true);
    try {
      await boardApi.produceSubrecipe(recipeId, amount, form.date);
      setSubrecipeStocks(await boardApi.subrecipeStocks());
      await onChanged(true);
    }
    catch (error) { onError(error instanceof Error ? error.message : "Subrețeta nu a putut fi produsă."); }
    finally { setBusy(false); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      form.mode === "custom_processing" &&
      (!form.partyId ||
        !form.ownershipOverrides?.some((x) => x.ownership === "customer"))
    ) {
      onError("Selectați clientul și cel puțin un material adus de client.");
      return;
    }
    setBusy(true);
    try {
      const charges: JobChargeInput[] =
        form.mode === "custom_processing"
          ? [
              {
                type: "processing_fee",
                description: "Serviciu procesare",
                quantity:
                  form.pricingBasis === "fixed"
                    ? 1
                    : form.pricingBasis === "output_qty"
                      ? form.outputQty
                      : form.inputQty,
                unitPrice: form.processingRate,
                amount: serviceAmount,
                direction: "receivable",
              },
            ]
          : [];
      await productionJobApi.create({ ...form, charges });
      setOpen(false);
      setForm(initial());
      await onChanged();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Lotul nu a putut fi creat.",
      );
    } finally {
      setBusy(false);
    }
  };
  const finalize = async (job: ProductionJob) => {
    const output =
      job.outputQty ||
      Number(prompt("Cantitatea finală restituită/produsă:") || 0);
    if (output <= 0) {
      onError("Cantitatea de ieșire trebuie să fie pozitivă.");
      return;
    }
    setBusy(true);
    try {
      const updated = await productionJobApi.finalize(job.id, output);
      setSelected(updated);
      await onChanged(true);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Finalizarea a eșuat.");
    } finally {
      setBusy(false);
    }
  };
  const startProduction = async (job: ProductionJob) => {
    if (!confirm(`Porniți producția pentru „${job.name}”? Ingredientele producătorului vor fi scăzute acum din stoc.`)) return;
    setBusy(true);
    try { const updated = await productionJobApi.start(job.id); setSelected(updated); await onChanged(true); }
    catch (error) { onError(error instanceof Error ? error.message : "Lotul nu a putut fi pornit."); }
    finally { setBusy(false); }
  };
  const addCharge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || selected.status === "completed") return;
    if (charge.type === "adjustment" && !charge.effect) {
      onError("Ajustarea trebuie să specifice increase sau decrease.");
      return;
    }
    setBusy(true);
    try {
      const updated = await productionJobApi.addCharge(selected.id, charge);
      setSelected(updated);
      setCharge({
        type: "other",
        description: "",
        amount: 0,
        direction: "expense",
      });
      await onChanged();
    } catch (e) {
      onError(
        e instanceof Error
          ? e.message
          : "Linia financiară nu a putut fi salvată.",
      );
    } finally {
      setBusy(false);
    }
  };
  const registerJobPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected?.partyId) return;
    setBusy(true);
    try {
      await paymentApi.create({
        partyId: selected.partyId,
        jobId: selected.id,
        date: jobPayment.date,
        amount: jobPayment.amount,
        direction: "incoming",
        method: jobPayment.method,
      });
      setSelected(await productionJobApi.get(selected.id));
      setJobPayment({ amount: 0, date: new Date().toISOString().slice(0, 10), method: "cash" });
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Plata nu a putut fi salvată.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl font-bold">Loturi de producție</h2>
          <p className="text-sm text-stone-400">
            Producție proprie și procesare pentru client.
          </p>
        </div>
        <button
          onClick={() => void openCreate()}
          className="rounded bg-amber-600 px-4 py-2 font-bold text-stone-950"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Lot nou
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută lot"
          className="rounded bg-stone-900 p-2"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as ProductionMode | "")}
          className="rounded bg-stone-900 p-2"
        >
          <option value="">Toate tipurile</option>
          <option value="own_production">Producție proprie</option>
          <option value="custom_processing">Procesare client</option>
        </select>
        <select
          value={partyFilter}
          onChange={(e) => setPartyFilter(e.target.value)}
          className="rounded bg-stone-900 p-2"
        >
          <option value="">Toți clienții</option>
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded bg-stone-900 p-2"
          title="De la"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded bg-stone-900 p-2"
          title="Până la"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded bg-stone-900 p-2"
        >
          <option value="">Toate statusurile</option>
          <option value="draft">Draft</option>
          <option value="in_progress">În lucru</option>
          <option value="completed">Finalizat</option>
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((j) => (
          <article
            key={j.id}
            className="rounded-xl border border-stone-800 bg-stone-900 p-4"
          >
            <div className="flex justify-between">
              <div>
                <span className="text-xs text-amber-500">
                  {j.mode === "own_production"
                    ? "Producție proprie"
                    : "Procesare client"}
                </span>
                <h3 className="font-bold">{j.name}</h3>
              </div>
              <span className="text-xs">{j.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              <span>
                Intrare
                <br />
                <b>
                  {qty.format(j.inputQty)} {j.unit}
                </b>
              </span>
              <span>
                Ieșire
                <br />
                <b>
                  {j.outputQty == null
                    ? j.status === "completed" ? "Necunoscută (istoric)" : "În lucru"
                    : `${qty.format(j.outputQty)} ${j.unit}`}
                </b>
              </span>
              <span>
                De încasat
                <br />
                <b>{money.format(j.totals.netReceivable)}</b>
              </span>
              <span>
                Încasat
                <br />
                <b className="text-emerald-500">{money.format(j.totals.paid)}</b>
              </span>
              <span>
                Sold
                <br />
                <b>{money.format(j.totals.balance)}</b>
              </span>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSelected(j)}
                className="rounded bg-stone-800 px-3 py-2"
              >
                <Eye className="h-4 w-4" />
              </button>
              {j.status === "draft" && (
                <button disabled={busy} onClick={() => void startProduction(j)} className="rounded bg-blue-700 px-3 py-2" title="Pornește producția și consumă ingredientele"><Play className="h-4 w-4" /></button>
              )}
              {j.status === "in_progress" && (
                <button
                  disabled={busy}
                  onClick={() => void finalize(j)}
                  className="rounded bg-emerald-700 px-3 py-2"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              )}
              {j.status === "draft" && (
                <button
                  onClick={() =>
                    void productionJobApi
                      .delete(j.id)
                      .then(() => onChanged())
                      .catch((e: Error) => onError(e.message))
                  }
                  className="rounded bg-red-950 px-3 py-2 text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </article>
        ))}
        {!visible.length && (
          <p className="col-span-2 py-16 text-center text-stone-500">
            <Factory className="mx-auto mb-2" />
            Nu există loturi.
          </p>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-3xl space-y-5 rounded-xl bg-stone-900 p-6"
          >
            <h3 className="text-xl font-bold">Lot nou</h3>
            <div>
              <p className="mb-2 text-sm">Tip activitate</p>
              <label className="mr-6">
                <input
                  type="radio"
                  checked={form.mode === "own_production"}
                  onChange={() =>
                    setForm({
                      ...form,
                      mode: "own_production",
                      partyId: null,
                      ownershipOverrides: [],
                    })
                  }
                />{" "}
                Producție proprie
              </label>
              <label>
                <input
                  type="radio"
                  checked={form.mode === "custom_processing"}
                  onChange={() =>
                    setForm({ ...form, mode: "custom_processing" })
                  }
                />{" "}
                Procesare pentru client
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Denumirea lotului"
                value={form.name}
                readOnly
                title="Denumirea este generată automat"
                className="rounded bg-stone-950 p-3 text-stone-300"
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="rounded bg-stone-950 p-3"
              />
              {form.mode === "custom_processing" && (
                <select
                  required
                  value={form.partyId || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      partyId: e.target.value,
                      ownershipOverrides: (form.ownershipOverrides || []).map(
                        (x) => ({ ...x, suppliedByPartyId: e.target.value }),
                      ),
                    })
                  }
                  className="rounded bg-stone-950 p-3"
                >
                  <option value="">Selectați clientul</option>
                  {customers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                required
                value={form.productId}
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value);
                  const linkedRecipes = recipesForProduct(e.target.value);
                  const recipe = linkedRecipes.find((item) => item.id === p?.recipeId) || linkedRecipes[0];
                  setForm({
                    ...form,
                    productId: e.target.value,
                    recipeId: recipe?.id || "",
                    unit: recipe?.baseUnit || "kg",
                  });
                }}
                className="rounded bg-stone-950 p-3"
              >
                <option value="">Produs</option>
                {eligibleProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              {availableRecipes.length > 1 ? <select required value={form.recipeId} onChange={(e) => { const recipe = availableRecipes.find((item) => item.id === e.target.value); setForm({ ...form, recipeId: e.target.value, unit: recipe?.baseUnit || "kg" }); }} className="rounded bg-stone-950 p-3" aria-label="Alege rețeta pentru produs">
                {availableRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.label}</option>)}
              </select> : <div className="rounded border border-stone-800 bg-stone-950/50 p-3 text-sm"><span className="text-xs text-stone-500">Rețeta folosită automat</span><br /><b>{availableRecipes[0]?.label || "Produs fără rețetă"}</b></div>}
              <input
                required
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="Cantitate intrare"
                value={form.inputQty || ""}
                onChange={(e) =>
                  setForm({ ...form, inputQty: Number(e.target.value) })
                }
                className="rounded bg-stone-950 p-3"
              />
              <div className="rounded border border-stone-800 bg-stone-950/50 p-3 text-sm text-stone-400"><b className="text-stone-200">Cantitatea obținută</b><br />Se completează la închiderea lotului, după producție.</div>
            </div>
            {products.length > eligibleProducts.length && <p className="rounded border border-amber-700/30 bg-amber-950/30 p-3 text-sm text-amber-400">{products.length - eligibleProducts.length} {products.length - eligibleProducts.length === 1 ? "produs nu apare" : "produse nu apar"} în listă deoarece nu au nicio rețetă asociată.</p>}
            {form.outputQty && form.outputQty > form.inputQty && (
              <p className="text-sm text-amber-400">
                Atenție: ieșirea depășește intrarea.
              </p>
            )}
            <div className="space-y-3 rounded-xl border border-stone-700 bg-stone-950/40 p-4">
                  <div>
                    <p className="font-bold">{form.mode === "custom_processing" ? "Rețeta și materialele clientului" : "Rețeta și necesarul de producție"}</p>
                    <p className="text-xs text-stone-400">Cantități și costuri calculate automat pentru lotul introdus.</p>
                  </div>
                  {recipePreview ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {[{ title: "Materie primă", icon: Beef, items: recipePreview.materiePrima }, { title: "Condimente directe", icon: Sprout, items: recipePreview.condimente }].map(({ title, icon: Icon, items }) => (
                        <section key={title} className="rounded-lg border border-stone-800 bg-stone-900 p-3">
                          <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-amber-500"><Icon className="h-4 w-4" />{title}</h4>
                          {(items.length || title === "Condimente directe" && recipePreview.subrecipes.length) ? <>
                          {items.map((item) => (
                            <div key={`${title}-${item.resourceId}`} className="flex justify-between border-b border-stone-800/50 py-1.5 text-sm last:border-0">
                              <span>{item.label}</span><b className="font-mono">{qty.format(item.quantity)} {item.unit}</b>
                            </div>
                          ))}
                          {title === "Condimente directe" && recipePreview.subrecipes.map((subrecipe) => {
                            const stocked = subrecipeStocks.find((item) => item.recipeId === subrecipe.recipeId);
                            const unitCost = stocked?.stock ? stocked.currentPrice : subrecipe.unitCost;
                            return <div key={`ingredient-${subrecipe.recipeId}`} className="border-b border-stone-800/50 py-1.5 text-sm last:border-0"><div className="flex justify-between"><span>{subrecipe.label} <small className="text-amber-500">(subrețetă)</small></span><b className="font-mono">{qty.format(subrecipe.quantity)} {subrecipe.unit}</b></div><div className="mt-1 flex justify-between text-xs text-stone-500"><span>{stocked?.stock ? "Cost mediu real din stoc" : "Cost calculat din rețetă"}</span><span>{money.format(unitCost)}/{subrecipe.unit} · {money.format(unitCost * subrecipe.quantity)}</span></div></div>;
                          })}
                          </> : <p className="text-xs text-stone-500">Fără poziții.</p>}
                        </section>
                      ))}
                      {recipePreview.subrecipes.map((subrecipe) => {
                        const stocked = subrecipeStocks.find((item) => item.recipeId === subrecipe.recipeId);
                        const missing = Math.max(0, subrecipe.quantity - Number(stocked?.stock || 0));
                        return (
                          <section key={`${subrecipe.recipeId}-${subrecipe.quantity}`} className="rounded-lg border border-amber-700/40 bg-stone-900 p-3 md:col-span-2">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
                              <div><h4 className="font-bold text-amber-500">Subrețetă: {subrecipe.label}</h4><p className="text-xs text-stone-400">Necesar {qty.format(subrecipe.quantity)} {subrecipe.unit} · În stoc {qty.format(stocked?.stock || 0)} {stocked?.unit || subrecipe.unit}</p></div>
                              <button type="button" disabled={busy} onClick={() => void produceSubrecipe(subrecipe.recipeId, missing || subrecipe.quantity)} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Produce și adaugă în stoc</button>
                            </div>
                            {missing > 0 && <p className="mb-2 rounded bg-amber-950/50 p-2 text-xs text-amber-400">Lipsesc {qty.format(missing)} {subrecipe.unit}. La pornirea lotului, stocul poate deveni negativ.</p>}
                            <p className="mb-1 text-xs font-bold uppercase text-stone-400">Condimente necesare pentru preparare</p>
                            {subrecipe.condimente.map((item) => <div key={item.resourceId} className="flex justify-between py-1 text-sm"><span>{item.label}</span><b>{qty.format(item.quantity)} {item.unit}</b></div>)}
                          </section>
                        );
                      })}
                      <section className="rounded-lg border border-stone-800 bg-stone-900 p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-stone-400"><Coins className="h-4 w-4" />Alte cheltuieli</h4>
                        {recipePreview.alteCheltuieli.length ? recipePreview.alteCheltuieli.map((item) => <div key={item.resourceId} className="flex justify-between py-1.5 text-sm"><span>{item.label}</span><span>{qty.format(item.quantity)} {item.unit}</span></div>) : <p className="text-xs text-stone-500">Fără poziții.</p>}
                      </section>
                      <section className="rounded-lg border border-stone-800 bg-stone-900 p-3">
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-stone-400"><Users className="h-4 w-4" />Manoperă</h4>
                        {recipePreview.muncaPersonal.length ? recipePreview.muncaPersonal.map((item) => <div key={`${item.employeeId}-${item.recipeLabel}`} className="flex justify-between py-1.5 text-sm"><span>{item.name}</span><span>{qty.format(item.quantity)}</span></div>) : <p className="text-xs text-stone-500">Fără poziții.</p>}
                      </section>
                      <section className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-3 md:col-span-2"><div className="flex items-center justify-between"><span className="font-bold">Cost total calculat al lotului</span><strong className="text-lg text-amber-500">{money.format(recipePreview.totals.grandTotal)}</strong></div><p className="mt-1 text-xs text-stone-500">Ingrediente, subrețete, cheltuieli și manoperă pentru cantitatea introdusă.</p></section>
                    </div>
                  ) : <p className="rounded bg-stone-900 p-3 text-sm text-stone-400">Selectați produsul și introduceți cantitatea pentru a vedea rețeta.</p>}
                </div>
            {form.mode === "custom_processing" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    required
                    value={form.pricingBasis || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pricingBasis: e.target.value as PricingBasis,
                      })
                    }
                    className="rounded bg-stone-950 p-3"
                  >
                    <option value="">Baza tarifului</option>
                    <option value="input_qty">kg intrare</option>
                    <option value="output_qty">kg ieșire</option>
                    <option value="fixed">sumă fixă</option>
                  </select>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Tarif"
                    value={form.processingRate || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        processingRate: Number(e.target.value),
                      })
                    }
                    className="rounded bg-stone-950 p-3"
                  />
                </div>
                <p className="rounded bg-stone-950 p-3">
                  Valoare serviciu estimată:{" "}
                  <b>{money.format(serviceAmount)}</b>
                </p>
              </>
            )}
            <textarea
              placeholder="Note"
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded bg-stone-950 p-3"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setOpen(false); setForm(initial()); }}>
                Renunță
              </button>
              <button
                disabled={busy}
                className="rounded bg-amber-600 px-5 py-2 font-bold text-stone-950"
              >
                Creează draft
              </button>
            </div>
          </form>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl space-y-5 rounded-xl bg-stone-900 p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-amber-500">
                  {selected.mode === "own_production"
                    ? "Producție proprie"
                    : "Procesare pentru client"}
                </p>
                <h3 className="text-xl font-bold">{selected.name}</h3>
              </div>
              <button onClick={() => setSelected(null)}>Închide</button>
            </div>
            <section className="grid gap-3 sm:grid-cols-5">
              {[
                ["Cost producător", selected.totals.producerMaterialCost],
                ["Cheltuieli", selected.totals.expenses],
                ["De încasat", selected.totals.netReceivable],
                ["Încasat", selected.totals.paid],
                ["Sold", selected.totals.balance],
              ].map(([l, v]) => (
                <div key={String(l)} className="rounded bg-stone-950 p-3">
                  <p className="text-xs text-stone-500">{l}</p>
                  <b>{money.format(Number(v))}</b>
                </div>
              ))}
            </section>
            <section>
              <h4 className="font-bold">Materiale client</h4>
              {selected.inputs
                .filter((i) => i.ownership === "customer")
                .map((i) => (
                  <p key={i.id}>
                    {i.resourceLabel}: {qty.format(i.quantity)} {i.unit}
                  </p>
                ))}
            </section>
            <section>
              <h4 className="font-bold">Materiale și cheltuieli producător</h4>
              {selected.inputs
                .filter((i) => i.ownership === "producer")
                .map((i) => (
                  <p key={i.id}>
                    {i.resourceLabel}: {qty.format(i.quantity)} {i.unit} ·{" "}
                    {money.format(i.totalCost)}
                  </p>
                ))}
            </section>
            <section>
              <h4 className="font-bold">Randament</h4>
              <p>
                {selected.outputQty == null
                  ? "Lot în lucru / ieșire necompletată"
                  : `${qty.format(selected.yieldPercent || 0)}% randament · ${qty.format(selected.lossPercent || 0)}% pierdere`}
              </p>
            </section>
            <section className="space-y-2">
              <h4 className="font-bold">Manoperă și linii financiare</h4>
              {selected.charges.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between rounded bg-stone-950 p-3"
                >
                  <span>
                    {item.description} · {item.direction}
                  </span>
                  <span>{money.format(item.amount)}</span>
                </div>
              ))}
              {selected.status !== "completed" && (
                <form
                  onSubmit={addCharge}
                  className="grid gap-2 rounded border border-stone-700 p-3 sm:grid-cols-4"
                >
                  <select
                    value={charge.type}
                    onChange={(e) =>
                      setCharge({
                        ...charge,
                        type: e.target.value as JobChargeInput["type"],
                      })
                    }
                    className="rounded bg-stone-950 p-2"
                  >
                    <option value="labor">Manoperă</option>
                    <option value="packaging">Ambalare</option>
                    <option value="utility">Utilități</option>
                    <option value="other">Altele</option>
                    <option value="adjustment">Ajustare</option>
                  </select>
                  <input
                    required
                    placeholder="Descriere"
                    value={charge.description}
                    onChange={(e) =>
                      setCharge({ ...charge, description: e.target.value })
                    }
                    className="rounded bg-stone-950 p-2"
                  />
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={charge.amount}
                    onChange={(e) =>
                      setCharge({ ...charge, amount: Number(e.target.value) })
                    }
                    className="rounded bg-stone-950 p-2"
                  />
                  <button
                    disabled={busy}
                    className="rounded bg-amber-600 font-bold text-stone-950"
                  >
                    Adaugă
                  </button>
                  {charge.type === "adjustment" && (
                    <select
                      value={charge.effect || ""}
                      onChange={(e) =>
                        setCharge({
                          ...charge,
                          effect: e.target.value as "increase" | "decrease",
                        })
                      }
                      className="rounded bg-stone-950 p-2"
                    >
                      <option value="">Efect</option>
                      <option value="increase">Crește</option>
                      <option value="decrease">Scade</option>
                    </select>
                  )}
                </form>
              )}
            </section>
            {selected.mode === "custom_processing" && selected.partyId && (
              <section className="space-y-2">
                <h4 className="font-bold">Serviciu facturat, plăți și sold</h4>
                {selected.payments.map((item) => (
                  <div key={item.id} className="flex justify-between rounded bg-stone-950 p-3">
                    <span>{item.date} · {item.method} · {item.status === "posted" ? "înregistrată" : "anulată"}</span>
                    <b className={item.direction === "incoming" ? "text-emerald-500" : "text-red-400"}>{item.direction === "incoming" ? "+ " : "− "}{money.format(item.amount)}</b>
                  </div>
                ))}
                <form
                  onSubmit={registerJobPayment}
                  className="grid gap-2 sm:grid-cols-4"
                >
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={jobPayment.amount}
                    onChange={(e) =>
                      setJobPayment({
                        ...jobPayment,
                        amount: Number(e.target.value),
                      })
                    }
                    className="rounded bg-stone-950 p-2"
                  />
                  <input
                    type="date"
                    value={jobPayment.date}
                    onChange={(e) =>
                      setJobPayment({ ...jobPayment, date: e.target.value })
                    }
                    className="rounded bg-stone-950 p-2"
                  />
                  <select
                    value={jobPayment.method}
                    onChange={(e) =>
                      setJobPayment({
                        ...jobPayment,
                        method: e.target.value as PaymentInput["method"],
                      })
                    }
                    className="rounded bg-stone-950 p-2"
                  >
                    <option value="cash">Numerar</option>
                    <option value="bank">Transfer</option>
                    <option value="card">Card</option>
                    <option value="other">Altele</option>
                  </select>
                  <button
                    disabled={busy}
                    className="rounded bg-amber-600 font-bold text-stone-950"
                  >
                    Înregistrează
                  </button>
                </form>
              </section>
            )}
            {selected.sourceKey && (
              <p className="text-xs text-stone-500">
                Proveniență: {selected.sourceKey}
              </p>
            )}
            {selected.status === "draft" && (
              <button disabled={busy} onClick={() => void startProduction(selected)} className="rounded bg-blue-700 px-4 py-2 font-bold text-white"><Play className="mr-2 inline h-4 w-4" />Pornește producția</button>
            )}
            {selected.status === "in_progress" && (
              <button
                disabled={busy}
                onClick={() => void finalize(selected)}
                className="rounded bg-emerald-700 px-4 py-2 font-bold"
              >
                Închide lotul și adaugă produsul în stoc
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
