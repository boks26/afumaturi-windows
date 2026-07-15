import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  MinusCircle, 
  FileText 
} from 'lucide-react';
import { FinalProduct, Recipe, ProductionReport } from '../types';
import { calculateRecipeCost } from '../utils/calculations';

interface ProductsManagerProps {
  products: FinalProduct[];
  recipes: Recipe[];
  reports: ProductionReport[];
  allResources: any[];
  allEmployees: any[];
  onAddProduct: (product: Omit<FinalProduct, 'id' | 'stock'>) => void;
  onEditProduct: (id: string, product: Partial<FinalProduct>) => void;
  onDeleteProduct: (id: string) => void;
  onReduceStock: (id: string, qty: number) => void;
}

export default function ProductsManager({
  products,
  recipes,
  reports,
  allResources,
  allEmployees,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onReduceStock,
}: ProductsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReduceOpen, setIsReduceOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FinalProduct | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [recipeId, setRecipeId] = useState('');

  // Reduce stock state
  const [reduceQty, setReduceQty] = useState(0);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => p.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  // Available finished product recipes
  const availableRecipes = useMemo(() => {
    return recipes.filter((r) => !r.isSubRecipe);
  }, [recipes]);

  const openCreate = () => {
    setName('');
    setRecipeId(availableRecipes[0]?.id || '');
    setIsCreateOpen(true);
  };

  const openEdit = (prod: FinalProduct) => {
    setSelectedProduct(prod);
    setName(prod.label);
    setRecipeId(prod.recipeId);
    setIsEditOpen(true);
  };

  const openReduce = (prod: FinalProduct) => {
    setSelectedProduct(prod);
    setReduceQty(1);
    setIsReduceOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !recipeId) return;
    onAddProduct({
      label: name,
      recipeId: recipeId,
    });
    setIsCreateOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !name.trim() || !recipeId) return;
    onEditProduct(selectedProduct.id, {
      label: name,
      recipeId: recipeId,
    });
    setIsEditOpen(false);
  };

  const handleReduceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || reduceQty <= 0) return;
    if (reduceQty > selectedProduct.stock) {
      alert('Eroare: Cantitatea extrasă depășește stocul disponibil!');
      return;
    }
    onReduceStock(selectedProduct.id, Number(reduceQty));
    setIsReduceOpen(false);
  };

  const handleDelete = (id: string, label: string) => {
    if (confirm(`Sigur doriți să ștergeți produsul final "${label}"? Aceasta va elimina produsul din catalog.`)) {
      onDeleteProduct(id);
    }
  };

  return (
    <div id="products-manager-container" className="space-y-6 animate-fadeIn">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-stone-900/40 p-4 rounded-xl border border-amber-900/10 gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-stone-100 flex items-center space-x-2">
            <Package className="h-5 w-5 text-amber-500" />
            <span>Catalog Produse Finale</span>
          </h2>
          <p className="text-xs text-stone-400">Gestiune catalog produse gata de vânzare, stocuri actuale obținute din dările de seamă și prețuri.</p>
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
          <button
            id="btn-create-product"
            onClick={openCreate}
            className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-3 py-2 rounded-lg text-xs transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Adăugă Produs Final</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-stone-900 rounded-xl border border-amber-900/20 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Denumire Produs</th>
                <th className="py-4 px-6">Rețetă Asociată</th>
                <th className="py-4 px-6 text-right">Cantitate (Stoc)</th>
                <th className="py-4 px-6 text-right">Preț Unitar Real</th>
                <th className="py-4 px-6 text-right">Valoare Totală Stoc</th>
                <th className="py-4 px-6">Ultima Producere</th>
                <th className="py-4 px-6 text-center">Gestiune Stoc</th>
                <th className="py-4 px-6 text-center">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">Nu s-au găsit produse finale înregistrate.</td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const recipe = recipes.find((r) => r.id === prod.recipeId);
                  const isCanned = recipe?.baseUnit === 'buc';

                  // Look up price from latest production report
                  const latestRep = [...reports]
                    .filter((r) => r.productId === prod.id && r.status === 'finalizat')
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                  const priceUnit = latestRep 
                    ? latestRep.sellingPriceReal 
                    : (recipe ? calculateRecipeCost(recipe.id, recipes, allResources, allEmployees) * (1 + (recipe.defaultMarkup || 70) / 100) : 100);

                  const totalValue = prod.stock * priceUnit;

                  return (
                    <tr key={prod.id} className="border-b border-stone-800/40 hover:bg-stone-800/20 transition-all">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded bg-amber-500 block animate-pulse" />
                          <span className="font-semibold text-stone-200 text-sm">{prod.label}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-stone-400 font-medium">
                        {recipe ? (
                          <span className="flex items-center space-x-1">
                            <FileText className="h-3.5 w-3.5 text-stone-500" />
                            <span>{recipe.label}</span>
                          </span>
                        ) : (
                          <span className="text-red-500 italic">Rețetă lipsă</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-stone-100 font-bold">
                        {prod.stock.toFixed(1)} <span className="text-[10px] text-stone-400 font-normal font-sans">{isCanned ? 'buc' : 'kg'}</span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-stone-300">
                        {priceUnit.toFixed(2)} <span className="text-[10px] text-stone-500">Lei/{isCanned ? 'buc' : 'kg'}</span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono text-amber-500 font-bold">
                        {totalValue.toFixed(2)} <span className="text-[10px] text-amber-700">Lei</span>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-stone-400">
                        {prod.lastProductionDate ? (
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3.5 w-3.5 text-stone-500" />
                            <span>{prod.lastProductionDate}</span>
                          </span>
                        ) : (
                          <span className="text-stone-600 italic">Fără loturi recente</span>
                        )}
                      </td>
                      {/* Reduce stock action */}
                      <td className="py-3.5 px-6 text-center">
                        <button
                          id={`btn-reduce-${prod.id}`}
                          onClick={() => openReduce(prod)}
                          disabled={prod.stock <= 0}
                          className="mx-auto flex items-center space-x-1 bg-stone-950 text-amber-500 hover:bg-amber-950/40 disabled:opacity-50 disabled:pointer-events-none px-2 py-1 rounded text-[11px] font-mono border border-amber-900/20 transition-all"
                        >
                          <MinusCircle className="h-3.5 w-3.5" />
                          <span>Vânzare / Consum</span>
                        </button>
                      </td>
                      {/* CRUD Actions */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            id={`btn-edit-prod-${prod.id}`}
                            onClick={() => openEdit(prod)}
                            className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-stone-800 rounded transition-all"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`btn-delete-prod-${prod.id}`}
                            onClick={() => handleDelete(prod.id, prod.label)}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-800 rounded transition-all"
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

      {/* Modal: Creare Produs Final */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <Plus className="text-amber-500 h-5 w-5" />
              <span>Creează Produs Final</span>
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Nume Produs Final</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ciafă afumată, Salam de casă uscat"
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Rețetă de referință asociată</label>
                <select
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                >
                  {availableRecipes.map((r) => (
                    <option key={r.id} value={r.id}>{r.label} ({r.baseUnit === 'buc' ? 'Conservă' : 'Calcule la 1kg'})</option>
                  ))}
                  {availableRecipes.length === 0 && (
                    <option value="">Creați o rețetă principală mai întâi</option>
                  )}
                </select>
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
                  disabled={!recipeId}
                  className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-4 py-2 rounded-lg text-xs transition-all disabled:opacity-50"
                >
                  Salvează Produs Final
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editare Produs Final */}
      {isEditOpen && selectedProduct && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <Edit2 className="text-amber-500 h-4 w-4" />
              <span>Editează Produs: {selectedProduct.label}</span>
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Nume Produs Final</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Rețetă de referință asociată</label>
                <select
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                >
                  {availableRecipes.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
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

      {/* Modal: Scoate din Stoc (Vanzare sau Consum) */}
      {isReduceOpen && selectedProduct && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <MinusCircle className="text-amber-500 h-5 w-5" />
              <span>Scoatere din Stoc (Vânzare/Consum)</span>
            </h3>

            <div className="bg-stone-950/50 p-3 rounded-lg border border-stone-800 text-xs font-mono mb-4 text-stone-400 space-y-1">
              <div className="flex justify-between">
                <span>Produs final:</span>
                <span className="text-stone-200 font-bold">{selectedProduct.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Stoc actual:</span>
                <span className="text-amber-500 font-bold">{selectedProduct.stock} {recipes.find(r=>r.id===selectedProduct.recipeId)?.baseUnit === 'buc' ? 'buc' : 'kg'}</span>
              </div>
            </div>

            <form onSubmit={handleReduceSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Cantitate de scos din stoc</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={reduceQty || ''}
                  onChange={(e) => setReduceQty(Number(e.target.value))}
                  placeholder="Ex: 5"
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsReduceOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-all"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-4 py-2 rounded-lg text-xs transition-all"
                >
                  Confirmă Extragerea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
