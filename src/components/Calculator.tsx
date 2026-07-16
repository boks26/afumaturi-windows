import React, { useState, useMemo } from 'react';
import { 
  Calculator as CalcIcon, 
  ChevronRight, 
  TrendingUp, 
  Layers, 
  Beef, 
  Sprout, 
  Coins, 
  Users 
} from 'lucide-react';
import { FinalProduct, Recipe, Resource, Employee } from '../types';
import { scaleRecipeIngredients, calculateRecipeCost } from '../utils/calculations';

interface CalculatorProps {
  products: FinalProduct[];
  recipes: Recipe[];
  resources: Resource[];
  employees: Employee[];
}

export default function Calculator({
  products,
  recipes,
  resources,
  employees,
}: CalculatorProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [inputQty, setInputQty] = useState<number>(10);

  // Selected product & its recipe
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const associatedRecipe = useMemo(() => {
    if (!selectedProduct) return null;
    return recipes.find((r) => r.id === selectedProduct.recipeId);
  }, [selectedProduct, recipes]);

  // Recursively scale ingredients
  const scaledData = useMemo(() => {
    if (!associatedRecipe || inputQty <= 0) return null;
    return scaleRecipeIngredients(associatedRecipe.id, inputQty, recipes, resources, employees);
  }, [associatedRecipe, inputQty, recipes, resources, employees]);

  // Pricing forecasts
  const priceForecasts = useMemo(() => {
    if (!scaledData || !associatedRecipe) return null;
    const totalCost = scaledData.totals.grandTotal;
    const costPerUnit = totalCost / inputQty;
    const markupMultiplier = 1 + (associatedRecipe.defaultMarkup || 70) / 100;
    const suggestedPricePerUnit = costPerUnit * markupMultiplier;
    const suggestedTotalSales = suggestedPricePerUnit * inputQty;
    const suggestedProfit = suggestedTotalSales - totalCost;

    return {
      costPerUnit,
      suggestedPricePerUnit,
      suggestedTotalSales,
      suggestedProfit,
    };
  }, [scaledData, associatedRecipe, inputQty]);

  return (
    <div id="calculator-screen" className="space-y-6 animate-fadeIn">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-stone-900/40 p-4 rounded-xl border border-amber-900/10 gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-stone-100 flex items-center space-x-2">
            <CalcIcon className="h-5 w-5 text-amber-500" />
            <span>Calculator Proporțional Lot de Producție</span>
          </h2>
          <p className="text-xs text-stone-400">Simulează necesarul exact de ingrediente, condimente și manoperă pentru un lot, bazat pe rețetele recursive.</p>
        </div>
      </div>

      {/* Row: Control input */}
      <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-5 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          {/* Product selector */}
          <div className="space-y-1">
            <label className="text-xs text-stone-400 block font-mono">Selectează Produs Final</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="bg-stone-950 text-stone-200 px-3 py-2.5 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
              {products.length === 0 && (
                <option value="">Nu există produse finale în catalog</option>
              )}
            </select>
          </div>

          {/* Semi-finished Qty input */}
          <div className="space-y-1">
            <label className="text-xs text-stone-400 block font-mono">
              Cantitate Semifabricat la Intrare ({associatedRecipe?.baseUnit === 'buc' ? 'buc / borcane' : 'kg'})
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                value={inputQty || ''}
                onChange={(e) => setInputQty(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 50"
                className="bg-stone-950 text-stone-100 px-3 py-2.5 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
              />
              <span className="bg-stone-950 px-4 py-2 rounded-lg text-xs font-mono border border-stone-800 text-stone-400 flex items-center shrink-0">
                {associatedRecipe?.baseUnit || 'kg'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator results */}
      {scaledData && priceForecasts && associatedRecipe && (
        <div className="space-y-6">
          {/* KPI simulation summaries */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-4 font-mono text-center">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Masa Semifabricat</p>
              <p className="text-xl font-bold text-stone-200 mt-1">
                {inputQty.toFixed(1)} <span className="text-xs font-normal font-sans text-stone-400">{associatedRecipe.baseUnit}</span>
              </p>
            </div>
            <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-4 font-mono text-center">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Cost de Producție Unitar</p>
              <p className="text-xl font-bold text-stone-200 mt-1">
                {priceForecasts.costPerUnit.toFixed(2)} <span className="text-xs font-normal font-sans text-stone-400">Lei/{associatedRecipe.baseUnit}</span>
              </p>
            </div>
            <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-4 font-mono text-center">
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">Vânzare Recomandat (Markup {associatedRecipe.defaultMarkup || 70}%)</p>
              <p className="text-xl font-bold text-amber-500 mt-1">
                {priceForecasts.suggestedPricePerUnit.toFixed(2)} <span className="text-xs font-normal font-sans text-stone-400">Lei</span>
              </p>
            </div>
            <div className="bg-stone-950/40 border border-amber-900/20 rounded-xl p-4 font-mono text-center ring-1 ring-amber-500/10">
              <p className="text-[10px] text-amber-500 uppercase tracking-wider">Profit Net Simulat</p>
              <p className="text-xl font-bold text-green-400 mt-1">
                +{priceForecasts.suggestedProfit.toFixed(2)} <span className="text-xs font-normal font-sans text-stone-400">Lei</span>
              </p>
            </div>
          </div>

          {/* Subdivisions of ingredients */}
          <div className="space-y-6">
            {/* 1. Materie Prima */}
            <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-300 border-b border-stone-800 pb-3 mb-4 flex items-center space-x-2">
                <Beef className="h-4 w-4 text-amber-500" />
                <span>Subdiviziune: Materie Primă (Carne de Bază)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800/60 text-stone-400 font-mono text-[10px] uppercase">
                      <th className="pb-2">Nume Carne</th>
                      <th className="pb-2 text-right">Cantitate Necesară</th>
                      <th className="pb-2 text-right">Preț Unitar Referință</th>
                      <th className="pb-2 text-right">Cost Total Sub-lot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaledData.materiePrima.map((item) => (
                      <tr key={item.resourceId} className="border-b border-stone-800/30 py-2">
                        <td className="py-2 font-semibold text-stone-200">{item.label}</td>
                        <td className="py-2 text-right font-mono text-stone-100 font-bold">
                          {item.quantity.toFixed(3)} <span className="text-[10px] text-stone-400">{item.unit}</span>
                        </td>
                        <td className="py-2 text-right font-mono text-stone-400">{item.priceUnit.toFixed(2)} Lei/{item.unit}</td>
                        <td className="py-2 text-right font-mono text-amber-500 font-bold">{item.total.toFixed(2)} Lei</td>
                      </tr>
                    ))}
                    {scaledData.materiePrima.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-stone-500 italic text-center">Fără materie primă.</td>
                      </tr>
                    )}
                    <tr className="font-bold text-stone-100 border-t border-stone-800">
                      <td className="py-2.5">Total Materie Primă</td>
                      <td colSpan={2}></td>
                      <td className="py-2.5 text-right font-mono text-amber-500">{scaledData.totals.materiePrima.toFixed(2)} Lei</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Condimente */}
            <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-300 border-b border-stone-800 pb-3 mb-4 flex items-center space-x-2">
                <Sprout className="h-4 w-4 text-amber-500" />
                <span>Subdiviziune: Condimente Specifice (Nivel Principal)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800/60 text-stone-400 font-mono text-[10px] uppercase">
                      <th className="pb-2">Nume Condiment / Ambalaj</th>
                      <th className="pb-2 text-right">Cantitate Necesară</th>
                      <th className="pb-2 text-right">Preț Unitar Referință</th>
                      <th className="pb-2 text-right">Cost Total Sub-lot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaledData.condimente.map((item) => (
                      <tr key={item.resourceId} className="border-b border-stone-800/30 py-2">
                        <td className="py-2 font-semibold text-stone-200">{item.label}</td>
                        <td className="py-2 text-right font-mono text-stone-100 font-bold">
                          {item.quantity.toFixed(3)} <span className="text-[10px] text-stone-400">{item.unit}</span>
                        </td>
                        <td className="py-2 text-right font-mono text-stone-400">{item.priceUnit.toFixed(2)} Lei/{item.unit}</td>
                        <td className="py-2 text-right font-mono text-amber-500 font-bold">{item.total.toFixed(2)} Lei</td>
                      </tr>
                    ))}
                    {scaledData.subrecipes.map((subrecipe) => (
                      <tr key={`ingredient-${subrecipe.recipeId}`} className="border-b border-stone-800/30 bg-amber-950/10">
                        <td className="py-2 font-semibold text-stone-200">{subrecipe.label} <span className="text-[10px] text-amber-500">(subrețetă)</span></td>
                        <td className="py-2 text-right font-mono text-stone-100 font-bold">{subrecipe.quantity.toFixed(3)} <span className="text-[10px] text-stone-400">{subrecipe.unit}</span></td>
                        <td className="py-2 text-right font-mono text-stone-400">{subrecipe.unitCost.toFixed(2)} Lei/{subrecipe.unit}</td><td className="py-2 text-right font-mono font-bold text-amber-500">{subrecipe.totalCost.toFixed(2)} Lei</td>
                      </tr>
                    ))}
                    {scaledData.condimente.length === 0 && scaledData.subrecipes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-stone-500 italic text-center">Fără condimente de nivel principal.</td>
                      </tr>
                    )}
                    <tr className="font-bold text-stone-100 border-t border-stone-800">
                      <td className="py-2.5">Total Condimente</td>
                      <td colSpan={2}></td>
                      <td className="py-2.5 text-right font-mono text-amber-500">{scaledData.totals.condimente.toFixed(2)} Lei</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Condimente din Retete / Saramuri */}
            {scaledData.subrecipes.length > 0 && (
              <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-5 shadow-lg">
                <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-300 border-b border-stone-800 pb-3 mb-4 flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  <span>Subdiviziune: Condimente Provenite din Sub-Rețete (Saramuri / Marinade)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-800/60 text-stone-400 font-mono text-[10px] uppercase">
                        <th className="pb-2">Nume Condiment</th>
                        <th className="pb-2 text-right">Cantitate Necesară</th>
                        <th className="pb-2 text-right">Preț Unitar Referință</th>
                        <th className="pb-2 text-right">Cost Total Sub-lot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scaledData.subrecipes.flatMap((subrecipe) => [
                        <tr key={`header-${subrecipe.recipeId}`} className="bg-amber-950/30 text-amber-500"><td colSpan={4} className="px-2 py-2 font-bold">{subrecipe.label} · necesar {subrecipe.quantity.toFixed(3)} {subrecipe.unit}</td></tr>,
                        ...subrecipe.condimente.map((item) => (
                          <tr key={`${subrecipe.recipeId}-${item.resourceId}`} className="border-b border-stone-800/30 py-2">
                            <td className="py-2 pl-3 font-semibold text-stone-200">{item.label}</td>
                            <td className="py-2 text-right font-mono text-stone-100 font-bold">{item.quantity.toFixed(4)} <span className="text-[10px] text-stone-400">{item.unit}</span></td>
                            <td className="py-2 text-right font-mono text-stone-400">{item.priceUnit.toFixed(2)} Lei/{item.unit}</td>
                            <td className="py-2 text-right font-mono text-amber-500 font-bold">{item.total.toFixed(2)} Lei</td>
                          </tr>
                        )),
                      ])}
                      <tr className="font-bold text-stone-100 border-t border-stone-800">
                        <td className="py-2.5">Total Condimente Sub-Rețete</td>
                        <td colSpan={2}></td>
                        <td className="py-2.5 text-right font-mono text-amber-500">{scaledData.totals.condimenteRecete.toFixed(2)} Lei</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Alte Cheltuieli / Overhead */}
            <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-300 border-b border-stone-800 pb-3 mb-4 flex items-center space-x-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <span>Subdiviziune: Regie &amp; Utilități (Energie, Lemn, etc.)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800/60 text-stone-400 font-mono text-[10px] uppercase">
                      <th className="pb-2">Nume Cheltuială / Utilitate</th>
                      <th className="pb-2 text-right">Cantitate Necesară</th>
                      <th className="pb-2 text-right">Tarif Unitar</th>
                      <th className="pb-2 text-right">Cost Total Sub-lot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaledData.alteCheltuieli.map((item) => (
                      <tr key={item.resourceId} className="border-b border-stone-800/30 py-2">
                        <td className="py-2 font-semibold text-stone-200">{item.label}</td>
                        <td className="py-2 text-right font-mono text-stone-100 font-bold">
                          {item.quantity.toFixed(3)} <span className="text-[10px] text-stone-400">{item.unit}</span>
                        </td>
                        <td className="py-2 text-right font-mono text-stone-400">{item.priceUnit.toFixed(2)} Lei/{item.unit}</td>
                        <td className="py-2 text-right font-mono text-amber-500 font-bold">{item.total.toFixed(2)} Lei</td>
                      </tr>
                    ))}
                    {scaledData.alteCheltuieli.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-stone-500 italic text-center">Fără utilități asociate.</td>
                      </tr>
                    )}
                    <tr className="font-bold text-stone-100 border-t border-stone-800">
                      <td className="py-2.5">Total Cheltuieli Regie</td>
                      <td colSpan={2}></td>
                      <td className="py-2.5 text-right font-mono text-amber-500">{scaledData.totals.alteCheltuieli.toFixed(2)} Lei</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Munca Personalului */}
            <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-300 border-b border-stone-800 pb-3 mb-4 flex items-center space-x-2">
                <Users className="h-4 w-4 text-amber-500" />
                <span>Subdiviziune: Muncă Personal (Salarizare Manoperă)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800/60 text-stone-400 font-mono text-[10px] uppercase">
                      <th className="pb-2">Nume Angajat</th>
                      <th className="pb-2">Rol / Responsabilitate</th>
                      <th className="pb-2 text-right">Tarif Configurat</th>
                      <th className="pb-2 text-right">Cantitate Efec.</th>
                      <th className="pb-2 text-right">Total Manoperă</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaledData.muncaPersonal.map((labor, idx) => (
                      <tr key={idx} className="border-b border-stone-800/30 py-2">
                        <td className="py-2 font-semibold text-stone-200">{labor.name}</td>
                        <td className="py-2 text-stone-400 font-medium">{labor.role} <span className="text-[10px] text-stone-500">({labor.recipeLabel})</span></td>
                        <td className="py-2 text-right font-mono text-stone-400">{labor.rate.toFixed(2)} Lei/{associatedRecipe.baseUnit}</td>
                        <td className="py-2 text-right font-mono text-stone-200">{labor.quantity.toFixed(2)}</td>
                        <td className="py-2 text-right font-mono text-amber-500 font-bold">{labor.total.toFixed(2)} Lei</td>
                      </tr>
                    ))}
                    {scaledData.muncaPersonal.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-2 text-stone-500 italic text-center">Niciun angajat alocat pentru această rețetă.</td>
                      </tr>
                    )}
                    <tr className="font-bold text-stone-100 border-t border-stone-800">
                      <td className="py-2.5" colSpan={2}>Total Manoperă Staff</td>
                      <td colSpan={2}></td>
                      <td className="py-2.5 text-right font-mono text-amber-500">{scaledData.totals.muncaPersonal.toFixed(2)} Lei</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grand Summary of the calculations */}
            <div className="bg-stone-950 border border-amber-600/30 rounded-xl p-6 shadow-2xl font-sans relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-amber-500 font-mono">Consolidare Cost Total Simulat</h4>
                  <p className="text-xs text-stone-400 mt-1">Aceste valori reflectă prețurile curente din depozite aplicate proporțional pe arborele rețetei.</p>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-xs text-stone-500 font-mono block">TOTAL COST DE PRODUCȚIE</span>
                  <span className="text-3xl font-extrabold font-mono text-stone-100">
                    {scaledData.totals.grandTotal.toFixed(2)} <span className="text-lg font-sans font-medium text-stone-400">MDL</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
