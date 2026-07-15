import React, { useState, useMemo } from 'react';
import { 
  ScrollText, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Trash, 
  Folder, 
  Scale, 
  ChevronDown 
} from 'lucide-react';
import { Recipe, RecipeLine, Resource, Employee, Category, RecipeLineType } from '../types';
import { calculateRecipeCost, wouldIntroduceCycle } from '../utils/calculations';

interface RecipesManagerProps {
  recipes: Recipe[];
  resources: Resource[];
  employees: Employee[];
  categories: Category[];
  onAddRecipe: (recipe: Omit<Recipe, 'id'>) => void;
  onEditRecipe: (id: string, recipe: Partial<Recipe>) => void;
  onDeleteRecipe: (id: string) => void;
}

export default function RecipesManager({
  recipes,
  resources,
  employees,
  categories,
  onAddRecipe,
  onEditRecipe,
  onDeleteRecipe,
}: RecipesManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  // Form states
  const [label, setLabel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isSubRecipe, setIsSubRecipe] = useState(false);
  const [baseUnit, setBaseUnit] = useState<'kg' | 'buc'>('kg');
  const [defaultMarkup, setDefaultMarkup] = useState(70);
  const [formLines, setFormLines] = useState<Omit<RecipeLine, 'id'>[]>([]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => r.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [recipes, searchTerm]);

  // Available resources divided by type
  const rawMaterials = useMemo(() => resources.filter((r) => r.bundle === 'materie_prima'), [resources]);
  const condiments = useMemo(() => resources.filter((r) => r.bundle === 'condiment'), [resources]);
  const expenses = useMemo(() => resources.filter((r) => r.bundle === 'alta_cheltuiala'), [resources]);
  
  // Subrecipes for embedding (only recipes where isSubRecipe === true)
  const subRecipesAvailable = useMemo(() => {
    return recipes.filter((r) => r.isSubRecipe);
  }, [recipes]);

  // Sum of raw materials in current form
  const rawMaterialsSum = useMemo(() => {
    return formLines
      .filter((l) => l.type === 'materie_prima')
      .reduce((sum, l) => sum + Number(l.quantity || 0), 0);
  }, [formLines]);

  const isRawMaterialSumValid = useMemo(() => {
    // If it's a sub-recipe of spices or if base unit is 'buc', maybe sum of meat is different.
    // But as per spec: "suma cantitatilor din materie prima sa fie egala cu 1 KG"
    // We validate if it is a main recipe, or if we have at least one raw material. Let's make it strict for 'kg' based recipes.
    if (baseUnit === 'buc') return true;
    if (formLines.filter((l) => l.type === 'materie_prima').length === 0) return true; // if no meat added yet
    return Math.abs(rawMaterialsSum - 1.0) < 0.001;
  }, [rawMaterialsSum, baseUnit, formLines]);

  const openCreate = () => {
    setEditingRecipeId(null);
    setLabel('');
    setCategoryId(categories[0]?.id || '');
    setIsSubRecipe(false);
    setBaseUnit('kg');
    setDefaultMarkup(70);
    setFormLines([
      { type: 'materie_prima', resourceId: rawMaterials[0]?.id || '', quantity: 1.0 }
    ]);
    setIsFormOpen(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setLabel(recipe.label);
    setCategoryId(recipe.categoryId);
    setIsSubRecipe(recipe.isSubRecipe);
    setBaseUnit(recipe.baseUnit);
    setDefaultMarkup(recipe.defaultMarkup);
    // clone lines
    setFormLines(recipe.lines.map((l) => ({
      type: l.type,
      resourceId: l.resourceId,
      subRecipeId: l.subRecipeId,
      employeeId: l.employeeId,
      quantity: l.quantity,
    })));
    setIsFormOpen(true);
  };

  const handleAddLine = (type: RecipeLineType) => {
    let defaultId = '';
    if (type === 'materie_prima') defaultId = rawMaterials[0]?.id || '';
    else if (type === 'condiment') defaultId = condiments[0]?.id || '';
    else if (type === 'subreteta') defaultId = subRecipesAvailable.find((r) => r.id !== editingRecipeId)?.id || '';
    else if (type === 'alta_cheltuiala') defaultId = expenses[0]?.id || '';
    else if (type === 'manopera') defaultId = employees[0]?.id || '';

    setFormLines((prev) => [
      ...prev,
      {
        type,
        resourceId: type !== 'subreteta' && type !== 'manopera' ? defaultId : undefined,
        subRecipeId: type === 'subreteta' ? defaultId : undefined,
        employeeId: type === 'manopera' ? defaultId : undefined,
        quantity: type === 'materie_prima' ? 0.0 : 0.01,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    setFormLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, key: string, value: any) => {
    setFormLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [key]: value,
      };

      // Reset references if type changes (though we add type-specific rows directly)
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    // Check raw material sum validation
    if (baseUnit === 'kg' && formLines.some(l => l.type === 'materie_prima') && !isRawMaterialSumValid) {
      alert(`Atenție! Suma materiilor prime este de ${rawMaterialsSum.toFixed(3)} kg. Trebuie să fie exact 1.00 kg pentru calcularea corectă la kilogram a semifabricatului!`);
      return;
    }

    // Check cycle references for any embedded subrecipes
    if (editingRecipeId) {
      for (const line of formLines) {
        if (line.type === 'subreteta' && line.subRecipeId) {
          if (wouldIntroduceCycle(editingRecipeId, line.subRecipeId, recipes)) {
            alert(`Eroare! Sub-rețeta selectată "${recipes.find(r=>r.id===line.subRecipeId)?.label}" introduce o referință circulară (buclă infinită). Vă rugăm să selectați o altă sub-rețetă.`);
            return;
          }
        }
      }
    }

    const recipeData = {
      label,
      categoryId,
      isSubRecipe,
      baseUnit,
      defaultMarkup: Number(defaultMarkup),
      lines: formLines.map((l, idx) => ({
        ...l,
        id: `l_${Date.now()}_${idx}`,
      })) as RecipeLine[],
    };

    if (editingRecipeId) {
      onEditRecipe(editingRecipeId, recipeData);
    } else {
      onAddRecipe(recipeData);
    }

    setIsFormOpen(false);
  };

  const handleDeleteRecipe = (id: string, label: string) => {
    if (confirm(`Sigur doriți să ștergeți rețeta "${label}"? Aceasta va deconecta rețeta de la produsele finale asociate.`)) {
      onDeleteRecipe(id);
    }
  };

  return (
    <div id="recipes-manager-container" className="space-y-6 animate-fadeIn">
      {/* Header section */}
      {!isFormOpen && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-stone-900/40 p-4 rounded-xl border border-amber-900/10 gap-4">
          <div>
            <h2 className="text-xl font-bold font-sans text-stone-100 flex items-center space-x-2">
              <ScrollText className="h-5 w-5 text-amber-500" />
              <span>Gestiune Rețete &amp; Sub-Rețete</span>
            </h2>
            <p className="text-xs text-stone-400">Gestiune rețete de producție, saramuri și marinade de injectare cu calcul de cost integrat recursiv.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-stone-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Caută rețetă..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-stone-950 text-stone-200 pl-9 pr-4 py-2 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-44 sm:w-64"
              />
            </div>
            <button
              id="btn-create-recipe-open"
              onClick={openCreate}
              className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-3 py-2 rounded-lg text-xs transition-all shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Creează Rețetă</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid listing recipes */}
      {!isFormOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecipes.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-stone-500 text-xs bg-stone-900 rounded-xl border border-dashed border-stone-800">
              Nu s-au găsit rețete înregistrate. Faceți clic pe "Creează Rețetă" pentru a începe.
            </div>
          ) : (
            filteredRecipes.map((recipe) => {
              const category = categories.find((c) => c.id === recipe.categoryId);
              
              // Recursive cost calculation!
              const cost = calculateRecipeCost(recipe.id, recipes, resources, employees);
              const retailPrice = cost * (1 + recipe.defaultMarkup / 100);
              const margin = retailPrice - cost;

              return (
                <div 
                  key={recipe.id} 
                  className="bg-stone-900 rounded-xl border border-amber-900/20 p-5 shadow-lg flex flex-col justify-between hover:border-amber-600/30 transition-all"
                >
                  <div>
                    {/* Title & Badge */}
                    <div className="flex items-start justify-between border-b border-stone-800 pb-3 mb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${recipe.isSubRecipe ? 'bg-amber-500' : 'bg-red-600'}`} />
                          <h4 className="font-bold text-stone-200 text-base">{recipe.label}</h4>
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono">
                          Categorie: {category?.name || 'Fără'} • Bază: 1 {recipe.baseUnit}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-mono rounded-full ${
                        recipe.isSubRecipe 
                          ? 'bg-amber-950/60 text-amber-500 border border-amber-500/10' 
                          : 'bg-red-950/60 text-red-400 border border-red-500/10'
                      }`}>
                        {recipe.isSubRecipe ? 'Sub-Rețetă' : 'Rețetă Produs'}
                      </span>
                    </div>

                    {/* Ingredients Summary */}
                    <div className="space-y-1.5 mb-6 text-xs text-stone-400 font-sans max-h-24 overflow-y-auto pr-1">
                      {recipe.lines.map((line, idx) => {
                        let itemLabel = '';
                        if (line.type === 'materie_prima' || line.type === 'condiment' || line.type === 'alta_cheltuiala') {
                          itemLabel = resources.find((r) => r.id === line.resourceId)?.label || 'Resursă ștearsă';
                        } else if (line.type === 'subreteta') {
                          itemLabel = recipes.find((r) => r.id === line.subRecipeId)?.label || 'Subrețetă ștearsă';
                        } else if (line.type === 'manopera') {
                          itemLabel = `Manoperă: ${employees.find((e) => e.id === line.employeeId)?.name || 'Angajat'}`;
                        }
                        const unitLabel = (line.type === 'subreteta') ? 'kg saramură' : (line.type === 'manopera' ? 'efort' : resources.find((r) => r.id === line.resourceId)?.unit || '');

                        return (
                          <div key={idx} className="flex justify-between items-center text-[11px] font-mono border-b border-stone-800/20 py-0.5">
                            <span className="truncate max-w-[180px]">{itemLabel}</span>
                            <span className="text-stone-300">{line.quantity.toFixed(3)} {unitLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pricing and Action row */}
                  <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] text-stone-500 font-mono uppercase">Cost Producție</p>
                        <p className="font-mono text-sm font-bold text-stone-200">{cost.toFixed(2)} Lei</p>
                      </div>
                      {!recipe.isSubRecipe && (
                        <>
                          <div>
                            <p className="text-[10px] text-stone-500 font-mono uppercase">Vânzare sugerat</p>
                            <p className="font-mono text-sm font-bold text-amber-500">{retailPrice.toFixed(2)} Lei</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-stone-500 font-mono uppercase">Adaos / Profit</p>
                            <p className="font-mono text-sm font-bold text-green-400">+{margin.toFixed(2)} Lei</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex space-x-1">
                      <button
                        id={`btn-edit-recipe-${recipe.id}`}
                        onClick={() => openEdit(recipe)}
                        className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-stone-800 rounded transition-all"
                        title="Editează Rețetă"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`btn-delete-recipe-${recipe.id}`}
                        onClick={() => handleDeleteRecipe(recipe.id, recipe.label)}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-800 rounded transition-all"
                        title="Șterge Rețetă"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Advanced Recipe Create/Edit Form */}
      {isFormOpen && (
        <div id="recipe-form-container" className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-6">
            <h3 className="text-lg font-bold text-stone-100 flex items-center space-x-2">
              <ScrollText className="text-amber-500 h-5 w-5" />
              <span>{editingRecipeId ? 'Editează Rețetă / Sub-Rețetă' : 'Creează Rețetă Nouă'}</span>
            </h3>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-stone-400 hover:text-stone-200 text-xs py-1.5 px-3 rounded-lg hover:bg-stone-800 transition-all"
            >
              Înapoi la Listă
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Basic Recipe fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-stone-950/40 p-4 rounded-xl border border-stone-800">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-stone-400 block font-mono">Denumire Rețetă</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Ciafă afumată premium, Brânză marinată"
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Categorie Produs</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Unitate de Bază</label>
                <select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value as 'kg' | 'buc')}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                >
                  <option value="kg">1 Kilogram (kg)</option>
                  <option value="buc">1 Bucată / Borcan (buc)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Tip Rețetă</label>
                <div className="flex space-x-4 pt-1.5">
                  <label className="inline-flex items-center text-xs text-stone-300 cursor-pointer">
                    <input
                      type="radio"
                      name="recipeTypeRadio"
                      checked={!isSubRecipe}
                      onChange={() => setIsSubRecipe(false)}
                      className="accent-amber-500 h-4 w-4 mr-1.5"
                    />
                    <span>Rețetă Produs Final</span>
                  </label>
                  <label className="inline-flex items-center text-xs text-stone-300 cursor-pointer">
                    <input
                      type="radio"
                      name="recipeTypeRadio"
                      checked={isSubRecipe}
                      onChange={() => setIsSubRecipe(true)}
                      className="accent-amber-500 h-4 w-4 mr-1.5"
                    />
                    <span>Sub-Rețetă (ex: Marinadă)</span>
                  </label>
                </div>
              </div>

              {!isSubRecipe && (
                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Adaos Comercial Adaos %</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={defaultMarkup || ''}
                    onChange={(e) => setDefaultMarkup(Number(e.target.value))}
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                </div>
              )}
            </div>

            {/* Validation helper for meat ratio */}
            {baseUnit === 'kg' && formLines.some(l => l.type === 'materie_prima') && (
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isRawMaterialSumValid 
                  ? 'bg-green-950/20 border-green-800/30 text-green-400' 
                  : 'bg-amber-950/20 border-amber-800/30 text-amber-500'
              }`}>
                <div className="flex items-center space-x-2">
                  {isRawMaterialSumValid ? (
                    <CheckCircle className="h-5 w-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold">
                      Suma Cărnii (Materie Primă): {rawMaterialsSum.toFixed(3)} kg / 1.000 kg
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Regulă strictă: Suma cantităților de carne din rețetă trebuie să fie exact 1.0 kg pentru un semifabricat unitar.
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold font-mono px-3 py-1 rounded-full ${
                  isRawMaterialSumValid ? 'bg-green-900/40' : 'bg-amber-900/40'
                }`}>
                  {isRawMaterialSumValid ? 'Validă' : 'Sursă invalidă'}
                </span>
              </div>
            )}

            {/* Recipe Lines Editor Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800 pb-2">
                <h4 className="text-sm font-bold font-sans text-stone-200">
                  Ingrediente, Condimente, Regie și Labor în Rețetă
                </h4>
                {/* Addition controls */}
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => handleAddLine('materie_prima')}
                    className="bg-stone-950 text-red-400 hover:bg-stone-800 px-2 py-1 rounded text-[11px] border border-stone-800"
                  >
                    + Carne
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddLine('condiment')}
                    className="bg-stone-950 text-green-400 hover:bg-stone-800 px-2 py-1 rounded text-[11px] border border-stone-800"
                  >
                    + Condiment
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddLine('subreteta')}
                    disabled={subRecipesAvailable.length === 0}
                    className="bg-stone-950 text-amber-500 hover:bg-stone-800 px-2 py-1 rounded text-[11px] border border-stone-800 disabled:opacity-40"
                  >
                    + Sub-Rețetă
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddLine('alta_cheltuiala')}
                    className="bg-stone-950 text-blue-400 hover:bg-stone-800 px-2 py-1 rounded text-[11px] border border-stone-800"
                  >
                    + Cheltuială / Regie
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddLine('manopera')}
                    className="bg-stone-950 text-indigo-400 hover:bg-stone-800 px-2 py-1 rounded text-[11px] border border-stone-800"
                  >
                    + Manoperă Staff
                  </button>
                </div>
              </div>

              {/* Listing lines */}
              <div className="space-y-3">
                {formLines.map((line, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                      line.type === 'materie_prima' ? 'bg-red-950/10 border-red-900/20' :
                      line.type === 'condiment' ? 'bg-green-950/10 border-green-900/20' :
                      line.type === 'subreteta' ? 'bg-amber-950/10 border-amber-900/20' :
                      line.type === 'alta_cheltuiala' ? 'bg-blue-950/10 border-blue-900/20' :
                      'bg-indigo-950/10 border-indigo-900/20'
                    }`}
                  >
                    {/* Column 1: Line Type Label */}
                    <div className="flex items-center space-x-2 w-full sm:w-1/4">
                      <span className={`w-2 h-2 rounded-full ${
                        line.type === 'materie_prima' ? 'bg-red-600' :
                        line.type === 'condiment' ? 'bg-green-500' :
                        line.type === 'subreteta' ? 'bg-amber-500' :
                        line.type === 'alta_cheltuiala' ? 'bg-blue-500' :
                        'bg-indigo-500'
                      }`} />
                      <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">
                        {line.type === 'materie_prima' ? 'Carne' :
                         line.type === 'condiment' ? 'Condiment' :
                         line.type === 'subreteta' ? 'Sub-Rețetă' :
                         line.type === 'alta_cheltuiala' ? 'Cheltuială' :
                         'Manoperă'}
                      </span>
                    </div>

                    {/* Column 2: Selection based on type */}
                    <div className="w-full sm:w-2/5">
                      {line.type === 'materie_prima' && (
                        <select
                          value={line.resourceId}
                          onChange={(e) => handleLineChange(index, 'resourceId', e.target.value)}
                          className="bg-stone-950 text-stone-200 px-3 py-1.5 rounded-lg text-xs w-full border border-stone-800"
                        >
                          {rawMaterials.map((r) => (
                            <option key={r.id} value={r.id}>{r.label} ({r.currentPrice} MDL)</option>
                          ))}
                        </select>
                      )}

                      {line.type === 'condiment' && (
                        <select
                          value={line.resourceId}
                          onChange={(e) => handleLineChange(index, 'resourceId', e.target.value)}
                          className="bg-stone-950 text-stone-200 px-3 py-1.5 rounded-lg text-xs w-full border border-stone-800"
                        >
                          {condiments.map((r) => (
                            <option key={r.id} value={r.id}>{r.label} ({r.currentPrice} MDL)</option>
                          ))}
                        </select>
                      )}

                      {line.type === 'subreteta' && (
                        <select
                          value={line.subRecipeId}
                          onChange={(e) => handleLineChange(index, 'subRecipeId', e.target.value)}
                          className="bg-stone-950 text-stone-200 px-3 py-1.5 rounded-lg text-xs w-full border border-stone-800"
                        >
                          {subRecipesAvailable
                            .filter((r) => r.id !== editingRecipeId)
                            .map((r) => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                        </select>
                      )}

                      {line.type === 'alta_cheltuiala' && (
                        <select
                          value={line.resourceId}
                          onChange={(e) => handleLineChange(index, 'resourceId', e.target.value)}
                          className="bg-stone-950 text-stone-200 px-3 py-1.5 rounded-lg text-xs w-full border border-stone-800"
                        >
                          {expenses.map((r) => (
                            <option key={r.id} value={r.id}>{r.label} ({r.currentPrice} MDL)</option>
                          ))}
                        </select>
                      )}

                      {line.type === 'manopera' && (
                        <select
                          value={line.employeeId}
                          onChange={(e) => handleLineChange(index, 'employeeId', e.target.value)}
                          className="bg-stone-950 text-stone-200 px-3 py-1.5 rounded-lg text-xs w-full border border-stone-800"
                        >
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Column 3: Quantity */}
                    <div className="flex items-center space-x-2 w-full sm:w-1/4">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        required
                        value={line.quantity}
                        onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Normă"
                        className="bg-stone-950 text-stone-100 px-3 py-1.5 rounded-lg text-xs font-mono border border-stone-800 text-right w-full"
                      />
                      <span className="text-[10px] text-stone-500 font-mono shrink-0">
                        {line.type === 'subreteta' ? 'kg' : (line.type === 'manopera' ? 'kg' : resources.find((r) => r.id === line.resourceId)?.unit || '')}
                      </span>
                    </div>

                    {/* Column 4: Quick delete row */}
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(index)}
                      className="p-1.5 text-stone-500 hover:text-red-500 hover:bg-stone-900 rounded transition-all shrink-0 self-end sm:self-auto"
                      title="Șterge rând"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {formLines.length === 0 && (
                  <p className="text-center text-xs text-stone-500 italic py-4">Rețeta nu are adăugate ingrediente. Folosiți butoanele de sus pentru a adăuga rânduri.</p>
                )}
              </div>
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-all"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-5 py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-amber-950/20"
              >
                {editingRecipeId ? 'Salvează Modificări Rețetă' : 'Creează Rețetă de Producție'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
