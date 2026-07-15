import React, { useState, useMemo } from 'react';
import { 
  Coins, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock 
} from 'lucide-react';
import { Resource } from '../types';

interface ExpensesManagerProps {
  resources: Resource[];
  onAddResource: (resource: Omit<Resource, 'id' | 'bundle'>) => void;
  onEditResource: (id: string, resource: Partial<Resource>) => void;
  onDeleteResource: (id: string) => void;
}

export default function ExpensesManager({
  resources,
  onAddResource,
  onEditResource,
  onDeleteResource,
}: ExpensesManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kW');
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(0);

  const expenses = useMemo(() => {
    return resources.filter(
      (r) => r.bundle === 'alta_cheltuiala' && r.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [resources, searchTerm]);

  const openCreate = () => {
    setName('');
    setUnit('kW');
    setPrice(0);
    setQty(0);
    setIsCreateOpen(true);
  };

  const openEdit = (res: Resource) => {
    setSelectedResource(res);
    setName(res.label);
    setUnit(res.unit);
    setPrice(res.currentPrice);
    setQty(res.stock);
    setIsEditOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddResource({
      label: name,
      unit: unit,
      currentPrice: Number(price),
      stock: Number(qty),
      lastPurchaseDate: new Date().toISOString().split('T')[0],
    });
    setIsCreateOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource || !name.trim()) return;
    onEditResource(selectedResource.id, {
      label: name,
      unit: unit,
      currentPrice: Number(price),
      stock: Number(qty),
      lastPurchaseDate: new Date().toISOString().split('T')[0],
    });
    setIsEditOpen(false);
  };

  const handleDelete = (id: string, label: string) => {
    if (confirm(`Sigur doriți să ștergeți cheltuiala operațională "${label}"? Aceasta este folosită în costurile rețetelor.`)) {
      onDeleteResource(id);
    }
  };

  return (
    <div id="expenses-manager-container" className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-stone-900/40 p-4 rounded-xl border border-amber-900/10 gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-stone-100 flex items-center space-x-2">
            <Coins className="h-5 w-5 text-amber-500" />
            <span>Alte Cheltuieli (Regie &amp; Utilități)</span>
          </h2>
          <p className="text-xs text-stone-400">Gestiune costuri de regie: curent electric, gaz metan, rumeguș de fum, apă și consumabile secundare.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Caută cheltuială..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-stone-950 text-stone-200 pl-9 pr-4 py-2 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-44 sm:w-64"
            />
          </div>
          <button
            id="btn-create-expense"
            onClick={openCreate}
            className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-3 py-2 rounded-lg text-xs transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Adăugă Cheltuială</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-stone-900 rounded-xl border border-amber-900/20 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Denumire Cheltuială / Consumabil</th>
                <th className="py-4 px-6 text-right">Cantitate / Unitate</th>
                <th className="py-4 px-6 text-right">Tarif Unitar</th>
                <th className="py-4 px-6 text-right">Suma Totală (Gestiune)</th>
                <th className="py-4 px-6">Data Ultimei Actualizări / Achitări</th>
                <th className="py-4 px-6 text-center">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500">Nu s-au găsit cheltuieli înregistrate.</td>
                </tr>
              ) : (
                expenses.map((res) => {
                  const totalSum = res.stock * res.currentPrice;
                  return (
                    <tr key={res.id} className="border-b border-stone-800/40 hover:bg-stone-800/20 transition-all">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                          <span className="font-semibold text-stone-200 text-sm">{res.label}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-stone-100 font-bold">
                        {res.stock.toFixed(2)} <span className="text-[10px] text-stone-400 font-normal font-sans">{res.unit}</span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-stone-300">
                        {res.currentPrice.toFixed(2)} <span className="text-[10px] text-stone-500">Lei/{res.unit}</span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-amber-500 font-bold">
                        {totalSum.toFixed(2)} <span className="text-[10px] text-amber-700">Lei</span>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-stone-400">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5 text-stone-500" />
                          <span>{res.lastPurchaseDate || new Date().toISOString().split('T')[0]}</span>
                        </span>
                      </td>
                      {/* CRUD Actions */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            id={`btn-edit-expense-${res.id}`}
                            onClick={() => openEdit(res)}
                            className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-stone-800 rounded transition-all"
                            title="Editează Cheltuială"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`btn-delete-expense-${res.id}`}
                            onClick={() => handleDelete(res.id, res.label)}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-800 rounded transition-all"
                            title="Șterge Cheltuială"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Creare Cheltuiala */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <Plus className="text-amber-500 h-5 w-5" />
              <span>Creează Cheltuială / Utilitate</span>
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Nume Cheltuială / Consumabil</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Curent electric, Gaz metan autoclave, Apă canal"
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Unitate de Măsură</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  >
                    <option value="kW">Kilowatt (kW)</option>
                    <option value="m3">Metru Cub (m3)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="l">Litru (l)</option>
                    <option value="luna">Lună (luna)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Preț / Unitate (MDL)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="Tarif per unitate"
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Cantitate în stoc / contorizată</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={qty || ''}
                  onChange={(e) => setQty(Number(e.target.value))}
                  placeholder="Cantitatea curentă"
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-all"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-4 py-2 rounded-lg text-xs transition-all"
                >
                  Salvează Cheltuială
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editare Cheltuiala */}
      {isEditOpen && selectedResource && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <Edit2 className="text-amber-500 h-4 w-4" />
              <span>Editează Cheltuială: {selectedResource.label}</span>
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Nume Cheltuială / Consumabil</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Unitate de Măsură</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  >
                    <option value="kW">Kilowatt (kW)</option>
                    <option value="m3">Metru Cub (m3)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="l">Litru (l)</option>
                    <option value="luna">Lună (luna)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Preț Referință (MDL)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Cantitate în stoc / contorizată</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-all"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-4 py-2 rounded-lg text-xs transition-all"
                >
                  Salvează Modificări
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
