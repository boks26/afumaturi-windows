import React, { useMemo, useState } from "react";
import { Archive, Edit3, Plus, Search, Users } from "lucide-react";
import {
  Party,
  PartyInput,
  PartyRole,
  PartyStatement,
  PaymentInput,
  ProductionJob,
} from "../types";
import { partyApi, paymentApi } from "../services/desktopApi";

interface Props {
  parties: Party[];
  jobs: ProductionJob[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}
const mdl = new Intl.NumberFormat("ro-MD", {
  style: "currency",
  currency: "MDL",
});

export default function PartiesManager({
  parties,
  jobs,
  onChanged,
  onError,
}: Props) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Party | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Party | null>(null);
  const [statement, setStatement] = useState<PartyStatement | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<PartyInput>({
    name: "",
    roles: ["customer"],
    phone: "",
    email: "",
    notes: "",
    active: true,
  });
  const [payment, setPayment] = useState({
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    method: "cash" as PaymentInput["method"],
    note: "",
  });
  const filtered = useMemo(
    () =>
      parties.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [parties, search],
  );
  const openForm = (party?: Party) => {
    setEditing(party || null);
    setForm(
      party
        ? { ...party }
        : {
            name: "",
            roles: ["customer"],
            phone: "",
            email: "",
            notes: "",
            active: true,
          },
    );
    setShowForm(true);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      editing
        ? await partyApi.update(editing.id, form)
        : await partyApi.create(form);
      setShowForm(false);
      await onChanged();
    } catch (e) {
      onError(
        e instanceof Error ? e.message : "Partenerul nu a putut fi salvat.",
      );
    } finally {
      setBusy(false);
    }
  };
  const details = async (party: Party) => {
    setSelected(party);
    try {
      setStatement(await partyApi.statement(party.id));
    } catch (e) {
      onError(
        e instanceof Error
          ? e.message
          : "Fișa partenerului nu a putut fi încărcată.",
      );
    }
  };
  const registerPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await paymentApi.create({
        partyId: selected.id,
        date: payment.date,
        amount: payment.amount,
        direction: "incoming",
        method: payment.method,
        note: payment.note,
      });
      setStatement(await partyApi.statement(selected.id));
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Plata nu a putut fi salvată.");
    } finally {
      setBusy(false);
    }
  };
  const voidPayment = async (id: string) => {
    if (!selected) return;
    const reason = prompt("Motivul anulării plății:")?.trim();
    if (!reason) return;
    setBusy(true);
    try {
      await paymentApi.void(id, reason);
      setStatement(await partyApi.statement(selected.id));
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Plata nu a putut fi anulată.");
    } finally {
      setBusy(false);
    }
  };
  const toggleRole = (role: PartyRole) =>
    setForm((old) => ({
      ...old,
      roles: old.roles.includes(role)
        ? old.roles.filter((item) => item !== role)
        : [...old.roles, role],
    }));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Parteneri</h2>
          <p className="text-sm text-stone-400">
            Clienți și furnizori, cu istoric financiar.
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-stone-950"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Partener
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-stone-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută după nume"
          className="w-full rounded-lg border border-stone-800 bg-stone-900 py-2.5 pl-10 pr-3"
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900">
        <table className="w-full text-sm">
          <thead className="bg-stone-950 text-stone-400">
            <tr>
              <th className="p-3 text-left">Partener</th>
              <th className="p-3 text-left">Roluri</th>
              <th className="p-3 text-left">Contact</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-stone-800">
                <td className="p-3">
                  <button
                    onClick={() => void details(p)}
                    className="font-semibold text-amber-500"
                  >
                    {p.name}
                  </button>
                  {!p.active && (
                    <span className="ml-2 text-xs text-stone-500">Arhivat</span>
                  )}
                </td>
                <td className="p-3">
                  {p.roles.map((r) => (
                    <span
                      key={r}
                      className="mr-1 rounded bg-stone-800 px-2 py-1 text-xs"
                    >
                      {r === "customer" ? "Client" : "Furnizor"}
                    </span>
                  ))}
                </td>
                <td className="p-3 text-stone-400">
                  {p.phone || p.email || "—"}
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => openForm(p)} className="p-2">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {p.active && (
                    <button
                      onClick={() =>
                        void partyApi
                          .archive(p.id)
                          .then(onChanged)
                          .catch((e: Error) => onError(e.message))
                      }
                      className="p-2 text-red-400"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-stone-500">
                  <Users className="mx-auto mb-2" />
                  Niciun partener
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-lg space-y-4 rounded-xl border border-stone-700 bg-stone-900 p-6"
          >
            <h3 className="text-lg font-bold">
              {editing ? "Editează partener" : "Partener nou"}
            </h3>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nume"
              className="w-full rounded bg-stone-950 p-3"
            />
            <div className="flex gap-4">
              {(["customer", "supplier"] as PartyRole[]).map((r) => (
                <label key={r}>
                  <input
                    type="checkbox"
                    checked={form.roles.includes(r)}
                    onChange={() => toggleRole(r)}
                  />{" "}
                  {r === "customer" ? "Client" : "Furnizor"}
                </label>
              ))}
            </div>
            <input
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Telefon"
              className="w-full rounded bg-stone-950 p-3"
            />
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="w-full rounded bg-stone-950 p-3"
            />
            <textarea
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Note"
              className="w-full rounded bg-stone-950 p-3"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}>
                Renunță
              </button>
              <button
                disabled={busy || !form.roles.length}
                className="rounded bg-amber-600 px-4 py-2 font-bold text-stone-950"
              >
                Salvează
              </button>
            </div>
          </form>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/70 p-6">
          <div className="mx-auto max-w-4xl space-y-5 rounded-xl bg-stone-900 p-6">
            <div className="flex justify-between">
              <h3 className="text-xl font-bold">Fișa: {selected.name}</h3>
              <button
                onClick={() => {
                  setSelected(null);
                  setStatement(null);
                }}
              >
                Închide
              </button>
            </div>
            {statement ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Total datorat", statement.totalReceivable],
                    ["Achitat", statement.totalPaid],
                    ["Sold", statement.balance],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="rounded bg-stone-950 p-4">
                      <p className="text-xs text-stone-500">{l}</p>
                      <p className="text-lg font-bold">
                        {mdl.format(Number(v))}
                      </p>
                    </div>
                  ))}
                </div>
                <h4 className="font-bold">Loturi</h4>
                <div className="space-y-2">
                  {jobs
                    .filter((j) => j.partyId === selected.id)
                    .map((j) => (
                      <div key={j.id} className="rounded bg-stone-950 p-3">
                        {j.name} · {mdl.format(j.totals.balance)}
                      </div>
                    ))}
                </div>
                <h4 className="font-bold">Plăți</h4>
                <div className="space-y-2">
                  {statement.payments.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded bg-stone-950 p-3"
                    >
                      <span>
                        {item.date} · {mdl.format(item.amount)} · {item.method}
                      </span>
                      {item.status === "posted" ? (
                        <button
                          disabled={busy}
                          onClick={() => void voidPayment(item.id)}
                          className="text-xs text-red-400"
                        >
                          Anulează
                        </button>
                      ) : (
                        <span className="text-xs text-stone-500">Anulată</span>
                      )}
                    </div>
                  ))}
                  {!statement.payments.length && (
                    <p className="text-sm text-stone-500">Nu sunt plăți.</p>
                  )}
                </div>
                <form
                  onSubmit={registerPayment}
                  className="grid gap-3 rounded border border-stone-700 p-4 sm:grid-cols-4"
                >
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={payment.amount}
                    onChange={(e) =>
                      setPayment({ ...payment, amount: Number(e.target.value) })
                    }
                    className="rounded bg-stone-950 p-2"
                  />
                  <input
                    type="date"
                    value={payment.date}
                    onChange={(e) =>
                      setPayment({ ...payment, date: e.target.value })
                    }
                    className="rounded bg-stone-950 p-2"
                  />
                  <select
                    value={payment.method}
                    onChange={(e) =>
                      setPayment({
                        ...payment,
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
                    Înregistrează plată
                  </button>
                </form>
              </>
            ) : (
              <p>Se încarcă…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
