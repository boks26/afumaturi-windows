import React, { useMemo, useState } from "react";
import { CheckCircle, Eye, Factory, Plus, Trash2 } from "lucide-react";
import {
  FinalProduct,
  JobChargeInput,
  PaymentInput,
  Party,
  PricingBasis,
  ProductionJob,
  ProductionJobInput,
  ProductionMode,
  Recipe,
  Resource,
} from "../types";
import { paymentApi, productionJobApi } from "../services/desktopApi";

interface Props {
  jobs: ProductionJob[];
  parties: Party[];
  products: FinalProduct[];
  recipes: Recipe[];
  resources: Resource[];
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
  onChanged,
  onError,
}: Props) {
  const [form, setForm] = useState(initial());
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ProductionJob | null>(null);
  const [busy, setBusy] = useState(false);
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
  const toggleCustomerResource = (id: string) =>
    setForm((old) => {
      const items = old.ownershipOverrides || [];
      const exists = items.some((x) => x.resourceId === id);
      return {
        ...old,
        ownershipOverrides: exists
          ? items.filter((x) => x.resourceId !== id)
          : [
              ...items,
              {
                resourceId: id,
                ownership: "customer",
                suppliedByPartyId: old.partyId,
              },
            ],
      };
    });
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
          onClick={() => setOpen(true)}
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
          <option value="cancelled">Anulat</option>
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
            <div className="mt-3 grid grid-cols-3 text-sm">
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
                    ? "În lucru"
                    : `${qty.format(j.outputQty)} ${j.unit}`}
                </b>
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
              {j.status !== "completed" && (
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
        <div className="fixed inset-0 z-50 overflow-auto bg-black/70 p-6">
          <form
            onSubmit={submit}
            className="mx-auto max-w-3xl space-y-5 rounded-xl bg-stone-900 p-6"
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
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded bg-stone-950 p-3"
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
                  setForm({
                    ...form,
                    productId: e.target.value,
                    recipeId: p?.recipeId || "",
                  });
                }}
                className="rounded bg-stone-950 p-3"
              >
                <option value="">Produs</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <select
                required
                value={form.recipeId}
                onChange={(e) => setForm({ ...form, recipeId: e.target.value })}
                className="rounded bg-stone-950 p-3"
              >
                <option value="">Rețetă</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
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
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="Cantitate ieșire (opțional)"
                value={form.outputQty || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    outputQty: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="rounded bg-stone-950 p-3"
              />
            </div>
            {form.outputQty && form.outputQty > form.inputQty && (
              <p className="text-sm text-amber-400">
                Atenție: ieșirea depășește intrarea.
              </p>
            )}
            {form.mode === "custom_processing" && (
              <>
                <div>
                  <p className="mb-2 font-bold">Materiale aduse de client</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {resources
                      .filter((r) => r.bundle !== "alta_cheltuiala")
                      .map((r) => (
                        <label key={r.id} className="rounded bg-stone-950 p-2">
                          <input
                            type="checkbox"
                            checked={form.ownershipOverrides?.some(
                              (x) => x.resourceId === r.id,
                            )}
                            onChange={() => toggleCustomerResource(r.id)}
                          />{" "}
                          {r.label}
                        </label>
                      ))}
                  </div>
                </div>
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
              <button type="button" onClick={() => setOpen(false)}>
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
        <div className="fixed inset-0 z-50 overflow-auto bg-black/70 p-6">
          <div className="mx-auto max-w-4xl space-y-5 rounded-xl bg-stone-900 p-6">
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
            <section className="grid gap-3 sm:grid-cols-4">
              {[
                ["Cost producător", selected.totals.producerMaterialCost],
                ["Cheltuieli", selected.totals.expenses],
                ["De încasat", selected.totals.netReceivable],
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
                  <div key={item.id} className="rounded bg-stone-950 p-3">
                    {item.date} · {money.format(item.amount)} · {item.status}
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
            {selected.status !== "completed" && (
              <button
                disabled={busy}
                onClick={() => void finalize(selected)}
                className="rounded bg-emerald-700 px-4 py-2 font-bold"
              >
                Finalizează
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
