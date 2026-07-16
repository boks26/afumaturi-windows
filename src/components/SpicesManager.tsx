import React, { useState, useMemo } from 'react';
import { 
  Sprout, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  Tag, 
  DollarSign,
  FileInput
} from 'lucide-react';
import { BulkStockImport, Resource } from '../types';
import BulkStockImportModal from './BulkStockImportModal';

interface SpicesManagerProps {
  resources: Resource[];
  onAddResource: (resource: Omit<Resource, 'id'>) => void;
  onEditResource: (id: string, resource: Partial<Resource>) => void;
  onDeleteResource: (id: string) => void;
  onAddStock: (id: string, qty: number, price?: number) => void;
  onRemoveStock: (id: string, qty: number) => void;
  onBulkImport: (data: BulkStockImport) => Promise<void>;
}

export default function SpicesManager({
  resources,
  onAddResource,
  onEditResource,
  onDeleteResource,
  onAddStock,
  onRemoveStock,
  onBulkImport,
}: SpicesManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [stockActionType, setStockActionType] = useState<'add' | 'remove'>('add');

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('g');
  const [price, setPrice] = useState(0);
  const [initialStock, setInitialStock] = useState(0);
  const [resourceType, setResourceType] = useState<'condiment' | 'ambalaj'>('condiment');

  // Stock Adjustment states
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustPrice, setAdjustPrice] = useState(0);

  // Filter condiments
  const condiments = useMemo(() => {
    return resources.filter(
      (r) => (r.bundle === 'condiment' || r.bundle === 'ambalaj') && r.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [resources, searchTerm]);

  const openCreate = () => {
    setName('');
    setUnit('g');
    setPrice(0);
    setInitialStock(0);
    setResourceType('condiment');
    setIsCreateOpen(true);
  };

  const openEdit = (res: Resource) => {
    setSelectedResource(res);
    setName(res.label);
    setUnit(res.unit);
    setPrice(res.currentPrice);
    setIsEditOpen(true);
  };

  const openStockAdjust = (res: Resource, type: 'add' | 'remove') => {
    setSelectedResource(res);
    setStockActionType(type);
    setAdjustQty(1);
    setAdjustPrice(res.currentPrice);
    setIsStockOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddResource({
      bundle: resourceType,
      label: name,
      unit: unit,
      currentPrice: Number(price),
      stock: Number(initialStock),
      lastPurchaseDate: initialStock > 0 ? new Date().toISOString().split('T')[0] : undefined,
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
    });
    setIsEditOpen(false);
  };

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource || adjustQty <= 0) return;
    if (stockActionType === 'add') {
      onAddStock(selectedResource.id, Number(adjustQty), Number(adjustPrice));
    } else {
      if (adjustQty > selectedResource.stock) {
        alert('Eroare: Nu puteți scoate din stoc o cantitate mai mare decât stocul existent!');
        return;
      }
      onRemoveStock(selectedResource.id, Number(adjustQty));
    }
    setIsStockOpen(false);
  };

  const handleDelete = (id: string, label: string) => {
    if (confirm(`Sigur doriți să ștergeți condimentul "${label}"? Aceasta poate afecta rețetele existente.`)) {
      onDeleteResource(id);
    }
  };

  return (
    <div id="spices-manager-container" className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-stone-900/40 p-4 rounded-xl border border-amber-900/10 gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-stone-100 flex items-center space-x-2">
            <Sprout className="h-5 w-5 text-amber-500" />
            <span>Condimente &amp; Ambalaje</span>
          </h2>
          <p className="text-xs text-stone-400">Administrare stocuri condimente, mațe, borcane și capace folosite în producție.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Caută produs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-stone-950 text-stone-200 pl-9 pr-4 py-2 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-44 sm:w-64"
            />
          </div>
          <button type="button" onClick={() => setIsBulkOpen(true)} className="flex items-center space-x-1 rounded-lg border border-amber-700 px-3 py-2 text-xs font-semibold text-amber-500 transition-all hover:bg-amber-950/30"><FileInput className="h-4 w-4" /><span>Import multiplu</span></button>
          <button
            id="btn-create-spice"
            onClick={openCreate}
            className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-3 py-2 rounded-lg text-xs transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Adaugă produs</span>
          </button>
        </div>
      </div>

      {/* Spices Table */}
      <div className="bg-stone-900 rounded-xl border border-amber-900/20 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Condiment / Ambalaj</th>
                <th className="py-4 px-6 text-right">Cantitate (Stoc)</th>
                <th className="py-4 px-6 text-right">Preț Unitar</th>
                <th className="py-4 px-6 text-right">Valoare Totală</th>
                <th className="py-4 px-6">Ultima Achiziție</th>
                <th className="py-4 px-6 text-center">Modifică Stoc</th>
                <th className="py-4 px-6 text-center">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {condiments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500">Nu s-au găsit condimente înregistrate.</td>
                </tr>
              ) : (
                condiments.map((res) => {
                  const totalSum = res.stock * res.currentPrice;
                  return (
                    <tr key={res.id} className="border-b border-stone-800/40 hover:bg-stone-800/20 transition-all">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="font-semibold text-stone-200 text-sm">{res.label}</span><span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] uppercase text-stone-400">{res.bundle === 'ambalaj' ? 'Ambalaj' : 'Condiment'}</span>
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
                        {res.lastPurchaseDate ? (
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3.5 w-3.5 text-stone-500" />
                            <span>{res.lastPurchaseDate}</span>
                          </span>
                        ) : (
                          <span className="text-stone-600 italic">Fără achiziții</span>
                        )}
                      </td>
                      {/* Stock Actions */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            id={`btn-add-stock-${res.id}`}
                            onClick={() => openStockAdjust(res, 'add')}
                            className="flex items-center space-x-1 bg-stone-950 text-green-400 hover:bg-green-950/20 px-2 py-1 rounded text-[11px] font-mono border border-green-900/20 transition-all"
                            title="Adaugă în Stoc"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>Intrare</span>
                          </button>
                          <button
                            id={`btn-remove-stock-${res.id}`}
                            onClick={() => openStockAdjust(res, 'remove')}
                            className="flex items-center space-x-1 bg-stone-950 text-red-400 hover:bg-red-950/20 px-2 py-1 rounded text-[11px] font-mono border border-red-900/20 transition-all"
                            title="Scoate din Stoc"
                          >
                            <MinusCircle className="h-3.5 w-3.5" />
                            <span>Ieșire</span>
                          </button>
                        </div>
                      </td>
                      {/* CRUD Actions */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            id={`btn-edit-${res.id}`}
                            onClick={() => openEdit(res)}
                            className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-stone-800 rounded transition-all"
                            title="Editează Condiment"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`btn-delete-${res.id}`}
                            onClick={() => handleDelete(res.id, res.label)}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-800 rounded transition-all"
                            title="Șterge Condiment"
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

      {/* Modal: Creare Condiment */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <Plus className="text-amber-500 h-5 w-5" />
              <span>Creează Condiment / Ambalaj</span>
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1"><label className="text-xs text-stone-400 block font-mono">Tip produs</label><select value={resourceType} onChange={(e) => setResourceType(e.target.value as 'condiment' | 'ambalaj')} className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs border border-amber-900/20 w-full"><option value="condiment">Condiment</option><option value="ambalaj">Ambalaj</option></select></div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Nume Condiment / Ambalaj</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sare gemă iodată, Borcane sticlă"
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
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Litru (l)</option>
                    <option value="ml">Mililitru (ml)</option>
                    <option value="buc">Bucată (buc)</option>
                    <option value="m">Metru (m)</option>
                    <option value="sac">Sac</option>
                    <option value="cutie">Cutie</option>
                    <option value="pachet">Pachet</option>
                    <option value="rola">Rolă</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Preț Achiziție (MDL)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="Preț per unitate"
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Stoc Inițial Disponibil</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialStock || ''}
                  onChange={(e) => setInitialStock(Number(e.target.value))}
                  placeholder="Ex: 10"
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
                  Salvează Condiment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkOpen && <BulkStockImportModal resources={resources} onImport={onBulkImport} onClose={() => setIsBulkOpen(false)} />}

      {/* Modal: Editare Condiment */}
      {isEditOpen && selectedResource && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <Edit2 className="text-amber-500 h-4 w-4" />
              <span>Editează Condiment: {selectedResource.label}</span>
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Nume Condiment / Ambalaj</label>
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
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Litru (l)</option>
                    <option value="ml">Mililitru (ml)</option>
                    <option value="buc">Bucată (buc)</option>
                    <option value="m">Metru (m)</option>
                    <option value="sac">Sac</option>
                    <option value="cutie">Cutie</option>
                    <option value="pachet">Pachet</option>
                    <option value="rola">Rolă</option>
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

      {/* Modal: Ajustare Stoc (Intrare / Iesire) */}
      {isStockOpen && selectedResource && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              {stockActionType === 'add' ? (
                <PlusCircle className="text-green-500 h-5 w-5" />
              ) : (
                <MinusCircle className="text-red-500 h-5 w-5" />
              )}
              <span>
                {stockActionType === 'add' ? 'Intrare Stoc (Achiziție)' : 'Ieșire Manuală Stoc'}
              </span>
            </h3>
            
            <div className="bg-stone-950/50 p-3 rounded-lg border border-stone-800 text-xs font-mono mb-4 text-stone-400 space-y-1">
              <div className="flex justify-between">
                <span>Condiment:</span>
                <span className="text-stone-200 font-bold">{selectedResource.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Stoc actual:</span>
                <span className="text-amber-500 font-bold">{selectedResource.stock.toFixed(2)} {selectedResource.unit}</span>
              </div>
            </div>

            <form onSubmit={handleStockSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Cantitate ({selectedResource.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={adjustQty || ''}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  placeholder={`Cantitatea în ${selectedResource.unit}`}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              {stockActionType === 'add' && (
                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Preț Achiziție (MDL / {selectedResource.unit})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={adjustPrice || ''}
                    onChange={(e) => setAdjustPrice(Number(e.target.value))}
                    placeholder="Prețul real de cumpărare"
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsStockOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-all"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className={`font-bold px-4 py-2 rounded-lg text-xs transition-all ${
                    stockActionType === 'add' 
                      ? 'bg-green-600 hover:bg-green-500 text-stone-950' 
                      : 'bg-red-600 hover:bg-red-500 text-stone-100'
                  }`}
                >
                  {stockActionType === 'add' ? 'Confirmă Intrarea' : 'Confirmă Ajustarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
