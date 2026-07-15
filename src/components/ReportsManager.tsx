import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  Calendar, 
  ArrowRight, 
  CheckCircle, 
  FileText, 
  AlertTriangle, 
  Beef, 
  Sprout, 
  Coins, 
  Users,
  ChevronLeft
} from 'lucide-react';
import { ProductionReport, FinalProduct, Recipe, Resource, Employee } from '../types';
import { calculateRecipeCost, scaleRecipeIngredients } from '../utils/calculations';

interface ReportsManagerProps {
  reports: ProductionReport[];
  products: FinalProduct[];
  recipes: Recipe[];
  resources: Resource[];
  employees: Employee[];
  onAddReport: (report: Omit<ProductionReport, 'id'>) => void;
  onEditReport: (id: string, report: Partial<ProductionReport>) => void;
  onDeleteReport: (id: string) => void;
}

export default function ReportsManager({
  reports,
  products,
  recipes,
  resources,
  employees,
  onAddReport,
  onEditReport,
  onDeleteReport,
}: ReportsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [productId, setProductId] = useState('');
  const [inputQty, setInputQty] = useState(0);
  const [outputQty, setOutputQty] = useState(0);
  const [sellingPriceReal, setSellingPriceReal] = useState(0);
  const [status, setStatus] = useState<'draft' | 'finalizat'>('finalizat');

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [reports, searchTerm]);

  // Selected product & recipe inside form
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === productId);
  }, [products, productId]);

  const associatedRecipe = useMemo(() => {
    if (!selectedProduct) return null;
    return recipes.find((r) => r.id === selectedProduct.recipeId);
  }, [selectedProduct, recipes]);

  // Real-time calculations inside the FORM
  const calculatedCostPerKgInput = useMemo(() => {
    if (!associatedRecipe) return 0;
    return calculateRecipeCost(associatedRecipe.id, recipes, resources, employees);
  }, [associatedRecipe, recipes, resources, employees]);

  const calculatedTotalCostInput = useMemo(() => {
    return inputQty * calculatedCostPerKgInput;
  }, [inputQty, calculatedCostPerKgInput]);

  const calculatedCostPerKgOutput = useMemo(() => {
    if (outputQty <= 0) return 0;
    return calculatedTotalCostInput / outputQty;
  }, [calculatedTotalCostInput, outputQty]);

  const sellingPriceSuggested = useMemo(() => {
    if (!associatedRecipe) return 0;
    const markupMultiplier = 1 + (associatedRecipe.defaultMarkup || 70) / 100;
    return calculatedCostPerKgOutput * markupMultiplier;
  }, [associatedRecipe, calculatedCostPerKgOutput]);

  // Auto-generate name when product, quantity, or date changes
  useEffect(() => {
    if (!editingReportId && selectedProduct) {
      const formattedDate = date.split('-').reverse().join('.');
      const sequential = reports.length + 1;
      setName(`Lot ${selectedProduct.label} #${sequential} (${formattedDate})`);
    }
  }, [selectedProduct, date, editingReportId, reports.length]);

  // Auto-fill suggested price in form if user hasn't edited or it is newly opened
  useEffect(() => {
    if (sellingPriceSuggested > 0 && !editingReportId) {
      setSellingPriceReal(Number(sellingPriceSuggested.toFixed(2)));
    }
  }, [sellingPriceSuggested, editingReportId]);

  const openCreate = () => {
    setEditingReportId(null);
    setViewingReportId(null);
    setProductId(products[0]?.id || '');
    setInputQty(10);
    setOutputQty(8.5); // assume 15% average weight loss as default
    setSellingPriceReal(0);
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('finalizat');
    setIsFormOpen(true);
  };

  const openEdit = (rep: ProductionReport) => {
    setEditingReportId(rep.id);
    setViewingReportId(null);
    setName(rep.name);
    setDate(rep.date);
    setProductId(rep.productId);
    setInputQty(rep.inputQty);
    setOutputQty(rep.outputQty);
    setSellingPriceReal(rep.sellingPriceReal);
    setStatus(rep.status);
    setIsFormOpen(true);
  };

  const openView = (id: string) => {
    setViewingReportId(id);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || inputQty <= 0 || outputQty <= 0) return;

    if (outputQty > inputQty) {
      const warn = confirm("Atenție: Cantitatea de produs gata depășește cantitatea de semifabricat la intrare! Sigur doriți să continuați?");
      if (!warn) return;
    }

    const income = sellingPriceReal * outputQty;
    const profit = income - calculatedTotalCostInput;

    const reportData = {
      name,
      date,
      productId,
      inputQty,
      outputQty,
      calculatedCostPerKgInput,
      calculatedTotalCostInput,
      calculatedCostPerKgOutput,
      sellingPriceSuggested,
      sellingPriceReal,
      income,
      profit,
      status,
    };

    if (editingReportId) {
      onEditReport(editingReportId, reportData);
    } else {
      onAddReport(reportData);
    }

    setIsFormOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Sigur doriți să ștergeți darea de seamă "${name}"? Stocurile afectate NU se vor re-ajusta automat pentru a proteja dările de seamă încheiate.`)) {
      onDeleteReport(id);
    }
  };

  // Extract viewed report details recursively
  const viewedReport = useMemo(() => {
    if (!viewingReportId) return null;
    return reports.find((r) => r.id === viewingReportId);
  }, [reports, viewingReportId]);

  const viewedReportProduct = useMemo(() => {
    if (!viewedReport) return null;
    return products.find((p) => p.id === viewedReport.productId);
  }, [viewedReport, products]);

  const viewedReportRecipe = useMemo(() => {
    if (!viewedReportProduct) return null;
    return recipes.find((r) => r.id === viewedReportProduct.recipeId);
  }, [viewedReportProduct, recipes]);

  const scaledIngredientsView = useMemo(() => {
    if (!viewedReport || !viewedReportRecipe) return null;
    return scaleRecipeIngredients(viewedReportRecipe.id, viewedReport.inputQty, recipes, resources, employees);
  }, [viewedReport, viewedReportRecipe, recipes, resources, employees]);

  return (
    <div id="reports-manager-container" className="space-y-6 animate-fadeIn">
      {/* 1. Normal list view */}
      {!isFormOpen && !viewingReportId && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-stone-900/40 p-4 rounded-xl border border-amber-900/10 gap-4">
            <div>
              <h2 className="text-xl font-bold font-sans text-stone-100 flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-amber-500" />
                <span>Dări de Seamă (Loturi de Producție)</span>
              </h2>
              <p className="text-xs text-stone-400">Jurnal loturi procesate, randament de afumare, prețuri de cost reale, vânzări și profitabilitate netă.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 text-stone-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Caută lot după nume..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-stone-950 text-stone-200 pl-9 pr-4 py-2 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-44 sm:w-64"
                />
              </div>
              <button
                id="btn-create-report-open"
                onClick={openCreate}
                className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-3 py-2 rounded-lg text-xs transition-all shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>Adăugă Dare de Seamă</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-stone-900 rounded-xl border border-amber-900/20 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-6">Denumire Lot</th>
                    <th className="py-4 px-6 text-center">Stare</th>
                    <th className="py-4 px-6">Data</th>
                    <th className="py-4 px-6 text-right">Cantitate Intrare</th>
                    <th className="py-4 px-6 text-right">Randament / Ieșire</th>
                    <th className="py-4 px-6 text-right">Preț Vânzare MDL</th>
                    <th className="py-4 px-6 text-right">Venit Net</th>
                    <th className="py-4 px-6 text-right">Profit Net MDL</th>
                    <th className="py-4 px-6 text-center">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-stone-500">Nu s-au găsit dări de seamă înregistrate.</td>
                    </tr>
                  ) : (
                    filteredReports.map((rep) => {
                      const prod = products.find((p) => p.id === rep.productId);
                      const isCanned = recipes.find(r=>r.id===prod?.recipeId)?.baseUnit === 'buc';
                      const weightLossPct = rep.inputQty > 0 ? (100 - (rep.outputQty * 100 / rep.inputQty)) : 0;

                      return (
                        <tr key={rep.id} className="border-b border-stone-800/40 hover:bg-stone-800/20 transition-all">
                          <td className="py-3.5 px-6">
                            <div>
                              <p className="font-semibold text-stone-200 text-sm">{rep.name}</p>
                              <span className="text-[10px] text-stone-500">Produs: {prod?.label || 'Custom'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span className={`px-2 py-0.5 text-[9px] uppercase font-mono font-bold rounded-full border ${
                              rep.status === 'finalizat' 
                                ? 'bg-green-950/50 text-green-400 border-green-500/10' 
                                : 'bg-amber-950/50 text-amber-500 border-amber-500/10'
                            }`}>
                              {rep.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-mono text-stone-400">{rep.date}</td>
                          <td className="py-3.5 px-6 text-right font-mono text-stone-300">{rep.inputQty.toFixed(1)} {isCanned ? 'buc' : 'kg'}</td>
                          <td className="py-3.5 px-6 text-right font-mono text-stone-300">
                            <p className="font-bold">{rep.outputQty.toFixed(1)} {isCanned ? 'buc' : 'kg'}</p>
                            {!isCanned && (
                              <span className="text-[10px] text-red-400">-{weightLossPct.toFixed(1)}% pierdere</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-right font-mono text-stone-100 font-semibold">{rep.sellingPriceReal.toFixed(2)}</td>
                          <td className="py-3.5 px-6 text-right font-mono text-green-400 font-bold">{rep.income.toFixed(2)}</td>
                          <td className="py-3.5 px-6 text-right font-mono text-amber-500 font-bold">{rep.profit.toFixed(2)}</td>
                          {/* Actions */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                id={`btn-view-rep-${rep.id}`}
                                onClick={() => openView(rep.id)}
                                className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-stone-800 rounded transition-all"
                                title="Vizualizează Dare de Seamă"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                id={`btn-edit-rep-${rep.id}`}
                                onClick={() => openEdit(rep)}
                                className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-stone-800 rounded transition-all"
                                title="Editează Lot"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                id={`btn-delete-rep-${rep.id}`}
                                onClick={() => handleDelete(rep.id, rep.name)}
                                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-800 rounded transition-all"
                                title="Șterge Lot"
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
        </>
      )}

      {/* 2. Create/Edit Form */}
      {isFormOpen && (
        <div id="report-form" className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-6">
            <h3 className="text-lg font-bold text-stone-100 flex items-center space-x-2">
              <FileSpreadsheet className="text-amber-500 h-5 w-5" />
              <span>{editingReportId ? 'Editează Dare de Seamă' : 'Înregistrare Lot Nou (Dare de Seamă)'}</span>
            </h3>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-stone-400 hover:text-stone-200 text-xs py-1.5 px-3 rounded-lg hover:bg-stone-800 transition-all"
            >
              Anulează
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-stone-950/40 p-4 rounded-xl border border-stone-800">
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Selectează Produs Final</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Dată Lot de Producție</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-stone-950 text-stone-100 px-3 py-2 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Denumire Lot (Auto-generat)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>
            </div>

            {/* Calculations and quantities columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quantities Card */}
              <div className="bg-stone-950/40 p-5 rounded-xl border border-stone-800 space-y-4">
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-amber-500 border-b border-stone-800 pb-2">
                  Cantități &amp; Intrări Lot
                </h4>

                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">
                    Cantitate Semifabricat la Intrare (carne masă crudă - {associatedRecipe?.baseUnit === 'buc' ? 'buc' : 'kg'})
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.01"
                    required
                    value={inputQty || ''}
                    onChange={(e) => setInputQty(parseFloat(e.target.value) || 0)}
                    placeholder="Greutate carne intrată"
                    className="bg-stone-950 text-stone-100 px-3 py-2 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-stone-500 pt-1">
                    <span>Preț de cost unitar rețetă:</span>
                    <span>{calculatedCostPerKgInput.toFixed(2)} Lei/{associatedRecipe?.baseUnit || 'kg'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">
                    Cantitate de Produs Final la Ieșire (după afumare/fierbere - {associatedRecipe?.baseUnit === 'buc' ? 'buc' : 'kg'})
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.01"
                    required
                    value={outputQty || ''}
                    onChange={(e) => setOutputQty(parseFloat(e.target.value) || 0)}
                    placeholder="Greutate lot după prelucrare"
                    className="bg-stone-950 text-stone-100 px-3 py-2 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                  {associatedRecipe?.baseUnit !== 'buc' && inputQty > 0 && outputQty > 0 && (
                    <div className="text-[11px] font-mono text-red-400 flex justify-between pt-1">
                      <span>Pierdere în greutate (evaporare):</span>
                      <span className="font-bold">-{(100 - (outputQty * 100 / inputQty)).toFixed(2)}%</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Stare Document</label>
                  <div className="flex space-x-4 pt-1.5">
                    <label className="inline-flex items-center text-xs text-stone-300 cursor-pointer">
                      <input
                        type="radio"
                        name="statusRadio"
                        checked={status === 'finalizat'}
                        onChange={() => setStatus('finalizat')}
                        className="accent-green-500 h-4 w-4 mr-1.5"
                      />
                      <span className="text-green-400 font-bold">Finalizat (Scade stocuri ingrediente)</span>
                    </label>
                    <label className="inline-flex items-center text-xs text-stone-300 cursor-pointer">
                      <input
                        type="radio"
                        name="statusRadio"
                        checked={status === 'draft'}
                        onChange={() => setStatus('draft')}
                        className="accent-amber-500 h-4 w-4 mr-1.5"
                      />
                      <span className="text-amber-500">Draft (Schiță - nu afectează stocul)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Financial Simulation Card */}
              <div className="bg-stone-950/40 p-5 rounded-xl border border-stone-800 space-y-4 justify-between flex flex-col">
                <div>
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-amber-500 border-b border-stone-800 pb-2 mb-4">
                    Simulator Cost de Revenire &amp; Preț Vânzare
                  </h4>

                  <div className="space-y-3 text-xs font-mono text-stone-400">
                    <div className="flex justify-between border-b border-stone-900 pb-1.5">
                      <span>COST TOTAL INTRODUS (Semifabricat):</span>
                      <span className="text-stone-200 font-bold">{calculatedTotalCostInput.toFixed(2)} Lei</span>
                    </div>
                    <div className="flex justify-between border-b border-stone-900 pb-1.5">
                      <span>COST DE REVENIRE REAL (Per kg produs finit):</span>
                      <span className="text-amber-500 font-bold">{calculatedCostPerKgOutput.toFixed(2)} Lei/{associatedRecipe?.baseUnit || 'kg'}</span>
                    </div>
                    <div className="flex justify-between border-b border-stone-900 pb-1.5">
                      <span>SUGESTIE PREȚ VÂNZARE (Adaos {associatedRecipe?.defaultMarkup || 70}%):</span>
                      <span className="text-green-400 font-bold">{sellingPriceSuggested.toFixed(2)} Lei</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-4">
                  <label className="text-xs text-stone-300 block font-mono font-semibold">Preț de Vânzare Real (MDL)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sellingPriceReal || ''}
                    onChange={(e) => setSellingPriceReal(parseFloat(e.target.value) || 0)}
                    placeholder="Suma finală negociată"
                    className="bg-stone-950 text-stone-100 px-3 py-2 rounded-lg text-xs font-mono border border-green-500/20 focus:outline-none focus:border-green-500 w-full font-bold"
                  />
                  <span className="text-[10px] text-stone-500 font-sans">Pre-generat automat cu prețul sugerat de rețetă (+70% implicit). Puteți ajusta liber.</span>
                </div>
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
                {editingReportId ? 'Salvează Darea de Seamă' : 'Înregistrează Lot Producție'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Detail Report Viewer (Vizualizare Dare de Seama) */}
      {viewingReportId && viewedReport && viewedReportProduct && viewedReportRecipe && scaledIngredientsView && (
        <div id="report-view-screen" className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 shadow-xl animate-fadeIn space-y-6">
          {/* Header toolbar */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center space-x-2">
              <button
                id="btn-back-to-reports"
                onClick={() => setViewingReportId(null)}
                className="p-1.5 bg-stone-950 text-stone-400 hover:text-stone-200 rounded-lg border border-stone-800 transition-all"
                title="Înapoi la Listă"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-lg font-bold text-stone-100 font-sans">{viewedReport.name}</h3>
                <span className="text-xs text-stone-500 font-mono">Dare de Seamă • Data încheierii: {viewedReport.date}</span>
              </div>
            </div>

            <span className={`px-2 py-0.5 text-[9px] uppercase font-mono font-bold rounded-full border ${
              viewedReport.status === 'finalizat' 
                ? 'bg-green-950/50 text-green-400 border-green-500/10' 
                : 'bg-amber-950/50 text-amber-500 border-amber-500/10'
            }`}>
              {viewedReport.status}
            </span>
          </div>

          {/* KPI Dashboard inside report detail */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-800/80 font-mono text-center">
              <span className="text-[10px] text-stone-500 uppercase block">Cantitate Intrare</span>
              <span className="text-base font-bold text-stone-200 mt-1 block">
                {viewedReport.inputQty.toFixed(2)} <span className="text-[10px] font-sans font-normal text-stone-400">{viewedReportRecipe.baseUnit}</span>
              </span>
            </div>
            <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-800/80 font-mono text-center">
              <span className="text-[10px] text-stone-500 uppercase block">Cantitate Ieșire</span>
              <span className="text-base font-bold text-stone-200 mt-1 block">
                {viewedReport.outputQty.toFixed(2)} <span className="text-[10px] font-sans font-normal text-stone-400">{viewedReportRecipe.baseUnit}</span>
              </span>
            </div>
            <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-800/80 font-mono text-center">
              <span className="text-[10px] text-stone-500 uppercase block">Preț Vânzare Real</span>
              <span className="text-base font-bold text-amber-500 mt-1 block">
                {viewedReport.sellingPriceReal.toFixed(2)} <span className="text-[10px] font-sans font-normal text-stone-400">MDL</span>
              </span>
            </div>
            <div className="bg-stone-950/40 p-4 rounded-xl border border-amber-900/10 font-mono text-center ring-1 ring-amber-500/10">
              <span className="text-[10px] text-amber-500 uppercase block">Profit Net Lot</span>
              <span className="text-base font-bold text-green-400 mt-1 block">
                +{viewedReport.profit.toFixed(2)} <span className="text-[10px] font-sans font-normal text-stone-400">MDL</span>
              </span>
            </div>
          </div>

          {/* Section details */}
          <div className="space-y-6">
            {/* A. Materie Prima */}
            <div className="bg-stone-950/20 p-4 rounded-xl border border-stone-800">
              <h4 className="text-xs font-bold uppercase font-mono text-stone-300 border-b border-stone-800 pb-2 mb-3 flex items-center space-x-2">
                <Beef className="h-3.5 w-3.5 text-amber-500" />
                <span>Materie Primă Consumată</span>
              </h4>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="text-stone-500 uppercase text-[9px] border-b border-stone-900">
                    <th className="pb-1.5">Nume ingredient</th>
                    <th className="pb-1.5 text-right">Cantitate consumată</th>
                    <th className="pb-1.5 text-right">Preț unitar de referință</th>
                    <th className="pb-1.5 text-right">Total cost</th>
                  </tr>
                </thead>
                <tbody>
                  {scaledIngredientsView.materiePrima.map((item) => (
                    <tr key={item.resourceId} className="border-b border-stone-900/50 text-stone-300">
                      <td className="py-2 text-stone-200 font-sans font-semibold">{item.label}</td>
                      <td className="py-2 text-right font-bold">{item.quantity.toFixed(3)} {item.unit}</td>
                      <td className="py-2 text-right">{item.priceUnit.toFixed(2)} Lei/{item.unit}</td>
                      <td className="py-2 text-right text-stone-200 font-bold">{item.total.toFixed(2)} Lei</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-stone-800 text-stone-200">
                    <td className="py-2 font-sans">Subtotal Materie Primă</td>
                    <td colSpan={2}></td>
                    <td className="py-2 text-right">{scaledIngredientsView.totals.materiePrima.toFixed(2)} Lei</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* B. Condimente */}
            <div className="bg-stone-950/20 p-4 rounded-xl border border-stone-800">
              <h4 className="text-xs font-bold uppercase font-mono text-stone-300 border-b border-stone-800 pb-2 mb-3 flex items-center space-x-2">
                <Sprout className="h-3.5 w-3.5 text-amber-500" />
                <span>Condimente Consumate (Nivel Principal)</span>
              </h4>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="text-stone-500 uppercase text-[9px] border-b border-stone-900">
                    <th className="pb-1.5">Nume condiment</th>
                    <th className="pb-1.5 text-right">Cantitate consumată</th>
                    <th className="pb-1.5 text-right">Preț unitar</th>
                    <th className="pb-1.5 text-right">Total cost</th>
                  </tr>
                </thead>
                <tbody>
                  {scaledIngredientsView.condimente.map((item) => (
                    <tr key={item.resourceId} className="border-b border-stone-900/50 text-stone-300">
                      <td className="py-2 text-stone-200 font-sans font-semibold">{item.label}</td>
                      <td className="py-2 text-right font-bold">{item.quantity.toFixed(3)} {item.unit}</td>
                      <td className="py-2 text-right">{item.priceUnit.toFixed(2)} Lei/{item.unit}</td>
                      <td className="py-2 text-right text-stone-200 font-bold">{item.total.toFixed(2)} Lei</td>
                    </tr>
                  ))}
                  {scaledIngredientsView.condimente.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-center text-stone-600 italic">Niciun condiment pe nivelul principal.</td>
                    </tr>
                  )}
                  <tr className="font-bold border-t border-stone-800 text-stone-200">
                    <td className="py-2 font-sans">Subtotal Condimente</td>
                    <td colSpan={2}></td>
                    <td className="py-2 text-right">{scaledIngredientsView.totals.condimente.toFixed(2)} Lei</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* C. Condimente pentru Recete (Subrecipes condiments) */}
            {scaledIngredientsView.condimenteRecete.length > 0 && (
              <div className="bg-stone-950/20 p-4 rounded-xl border border-stone-800">
                <h4 className="text-xs font-bold uppercase font-mono text-stone-300 border-b border-stone-800 pb-2 mb-3 flex items-center space-x-2">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <span>Condimente pentru Rețete (Marinade / Saramuri)</span>
                </h4>
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="text-stone-500 uppercase text-[9px] border-b border-stone-900">
                      <th className="pb-1.5">Nume condiment din sub-rețetă</th>
                      <th className="pb-1.5 text-right">Cantitate folosită</th>
                      <th className="pb-1.5 text-right">Preț unitar</th>
                      <th className="pb-1.5 text-right">Total cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaledIngredientsView.condimenteRecete.map((item) => (
                      <tr key={item.resourceId} className="border-b border-stone-900/50 text-stone-300">
                        <td className="py-2 text-stone-200 font-sans font-semibold">{item.label}</td>
                        <td className="py-2 text-right font-bold">{item.quantity.toFixed(4)} {item.unit}</td>
                        <td className="py-2 text-right">{item.priceUnit.toFixed(2)} Lei/{item.unit}</td>
                        <td className="py-2 text-right text-stone-200 font-bold">{item.total.toFixed(2)} Lei</td>
                      </tr>
                    ))}
                    <tr className="font-bold border-t border-stone-800 text-stone-200">
                      <td className="py-2 font-sans">Subtotal Condimente Sub-Rețete</td>
                      <td colSpan={2}></td>
                      <td className="py-2 text-right">{scaledIngredientsView.totals.condimenteRecete.toFixed(2)} Lei</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* D. Alte Cheltuieli */}
            <div className="bg-stone-950/20 p-4 rounded-xl border border-stone-800">
              <h4 className="text-xs font-bold uppercase font-mono text-stone-300 border-b border-stone-800 pb-2 mb-3 flex items-center space-x-2">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span>Alte Cheltuieli (Regie, Utilități &amp; Amortizări)</span>
              </h4>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="text-stone-500 uppercase text-[9px] border-b border-stone-900">
                    <th className="pb-1.5">Denumire cheltuială regie</th>
                    <th className="pb-1.5 text-right">Cantitate alocată</th>
                    <th className="pb-1.5 text-right">Tarif</th>
                    <th className="pb-1.5 text-right">Sumă totală</th>
                  </tr>
                </thead>
                <tbody>
                  {scaledIngredientsView.alteCheltuieli.map((item) => (
                    <tr key={item.resourceId} className="border-b border-stone-900/50 text-stone-300">
                      <td className="py-2 text-stone-200 font-sans font-semibold">{item.label}</td>
                      <td className="py-2 text-right font-bold">{item.quantity.toFixed(3)} {item.unit}</td>
                      <td className="py-2 text-right">{item.priceUnit.toFixed(2)} Lei/{item.unit}</td>
                      <td className="py-2 text-right text-stone-200 font-bold">{item.total.toFixed(2)} Lei</td>
                    </tr>
                  ))}
                  {scaledIngredientsView.alteCheltuieli.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-center text-stone-600 italic">Nicio cheltuială regie de contorizat.</td>
                    </tr>
                  )}
                  <tr className="font-bold border-t border-stone-800 text-stone-200">
                    <td className="py-2 font-sans">Subtotal Alte Cheltuieli</td>
                    <td colSpan={2}></td>
                    <td className="py-2 text-right">{scaledIngredientsView.totals.alteCheltuieli.toFixed(2)} Lei</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* E. Munca Personalului */}
            <div className="bg-stone-950/20 p-4 rounded-xl border border-stone-800">
              <h4 className="text-xs font-bold uppercase font-mono text-stone-300 border-b border-stone-800 pb-2 mb-3 flex items-center space-x-2">
                <Users className="h-3.5 w-3.5 text-amber-500" />
                <span>Munca Personalului Alocată (Manoperă)</span>
              </h4>
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="text-stone-500 uppercase text-[9px] border-b border-stone-900">
                    <th className="pb-1.5">Nume lucrător</th>
                    <th className="pb-1.5">Functie</th>
                    <th className="pb-1.5 text-right">Plată / unitate rețetă</th>
                    <th className="pb-1.5 text-right font-bold">Sumă totală manoperă</th>
                  </tr>
                </thead>
                <tbody>
                  {scaledIngredientsView.muncaPersonal.map((labor, idx) => (
                    <tr key={idx} className="border-b border-stone-900/50 text-stone-300">
                      <td className="py-2 text-stone-200 font-sans font-semibold">{labor.name}</td>
                      <td className="py-2 text-stone-400 font-sans font-medium">{labor.role}</td>
                      <td className="py-2 text-right">{labor.rate.toFixed(2)} Lei/{viewedReportRecipe.baseUnit}</td>
                      <td className="py-2 text-right text-stone-200 font-bold">{labor.total.toFixed(2)} Lei</td>
                    </tr>
                  ))}
                  {scaledIngredientsView.muncaPersonal.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-center text-stone-600 italic">Niciun lucrător plătit per kilogram pentru acest lot.</td>
                    </tr>
                  )}
                  <tr className="font-bold border-t border-stone-800 text-stone-200">
                    <td className="py-2 font-sans" colSpan={2}>Subtotal Muncă Personal</td>
                    <td colSpan={1}></td>
                    <td className="py-2 text-right">{scaledIngredientsView.totals.muncaPersonal.toFixed(2)} Lei</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* F. Totals Section */}
            <div className="bg-stone-950 border border-amber-600/30 rounded-xl p-5 shadow-lg space-y-4 font-mono">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 border-b border-stone-800 pb-2 font-sans">
                Registru Consolidat de Costuri
              </h4>
              <div className="space-y-2 text-xs text-stone-400">
                <div className="flex justify-between">
                  <span>Subtotal Materie Primă:</span>
                  <span className="text-stone-200">{scaledIngredientsView.totals.materiePrima.toFixed(2)} Lei</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal Condimente:</span>
                  <span className="text-stone-200">{scaledIngredientsView.totals.condimente.toFixed(2)} Lei</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal Condimente Sub-Rețete:</span>
                  <span className="text-stone-200">{scaledIngredientsView.totals.condimenteRecete.toFixed(2)} Lei</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal Alte Cheltuieli (Overhead):</span>
                  <span className="text-stone-200">{scaledIngredientsView.totals.alteCheltuieli.toFixed(2)} Lei</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal Muncă Personal:</span>
                  <span className="text-stone-200">{scaledIngredientsView.totals.muncaPersonal.toFixed(2)} Lei</span>
                </div>
                <div className="flex justify-between text-base font-bold text-stone-100 border-t border-stone-800 pt-3">
                  <span className="font-sans">Total Cost de Revenire General (MDL):</span>
                  <span className="text-amber-500">{scaledIngredientsView.totals.grandTotal.toFixed(2)} Lei</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
