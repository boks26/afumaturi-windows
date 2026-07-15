import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Layers, 
  AlertTriangle, 
  Calendar, 
  Grid, 
  BarChart3,
  ArrowRight,
  Plus,
  Package,
  Beef,
  Sprout
} from 'lucide-react';
import { Category, Resource, Employee, Recipe, FinalProduct, ProductionReport } from '../types';
import { scaleRecipeIngredients } from '../utils/calculations';

interface DashboardProps {
  categories: Category[];
  resources: Resource[];
  recipes: Recipe[];
  employees: Employee[];
  products: FinalProduct[];
  reports: ProductionReport[];
  setActiveTab: (tab: string) => void;
  onAddStock: (resourceId: string, quantity: number, priceUnit?: number) => void;
}

type PeriodFilter = '7_zile' | '30_zile' | '90_zile' | 'tot';

export default function Dashboard({ 
  categories, 
  resources, 
  recipes, 
  employees, 
  products, 
  reports,
  setActiveTab,
  onAddStock
}: DashboardProps) {
  const [period, setPeriod] = useState<PeriodFilter>('30_zile');
  const [viewMode, setViewMode] = useState<'tabel' | 'grafic'>('grafic');
  const [forecastDays, setForecastDays] = useState<number>(10);

  // Filter reports by period
  const filteredReports = useMemo(() => {
    const now = new Date();
    return reports.filter((rep) => {
      if (rep.status !== 'finalizat') return false;
      const repDate = new Date(rep.date);
      const diffTime = Math.abs(now.getTime() - repDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (period === '7_zile') return diffDays <= 7;
      if (period === '30_zile') return diffDays <= 30;
      if (period === '90_zile') return diffDays <= 90;
      return true;
    });
  }, [reports, period]);

  // Aggregate Row 1: Producere, Cheltuieli, Profit
  const financialTotals = useMemo(() => {
    let producere = 0; // Total sales income
    let cheltuieli = 0; // Total cost of materials + expenses + labor

    filteredReports.forEach((rep) => {
      producere += rep.income;
      cheltuieli += rep.calculatedTotalCostInput;
    });

    const profit = producere - cheltuieli;
    return { producere, cheltuieli, profit };
  }, [filteredReports]);

  // Forecast Widget (Row 3): Ce ar trebui de cumparat
  const forecastItems = useMemo(() => {
    // 1. Calculate total condiment and other expenses consumed in ALL final reports over the last 30 days
    const consumableResources = resources.filter(
      (r) => r.bundle === 'condiment' || r.bundle === 'alta_cheltuiala'
    );

    const consumptionMap: { [resId: string]: number } = {};
    consumableResources.forEach((r) => {
      consumptionMap[r.id] = 0;
    });

    // Sum up consumptions
    reports.forEach((rep) => {
      if (rep.status !== 'finalizat') return;
      const scaled = scaleRecipeIngredients(rep.productId === 'prod_tusonca' ? 'rec_tusonca_porc' : (rep.productId === 'prod_ciafa' ? 'rec_ciafa_afumata' : 'rec_salam_casa'), rep.inputQty, recipes, resources, employees);
      
      scaled.condimente.forEach((item) => {
        if (consumptionMap[item.resourceId] !== undefined) {
          consumptionMap[item.resourceId] += item.quantity;
        }
      });
      scaled.condimenteRecete.forEach((item) => {
        if (consumptionMap[item.resourceId] !== undefined) {
          consumptionMap[item.resourceId] += item.quantity;
        }
      });
      scaled.alteCheltuieli.forEach((item) => {
        if (consumptionMap[item.resourceId] !== undefined) {
          consumptionMap[item.resourceId] += item.quantity;
        }
      });
    });

    // 2. Average daily consumption (assuming 30 days baseline or total duration if fewer)
    const baselineDays = 30;
    const forecastResults = consumableResources.map((res) => {
      const totalConsumed = consumptionMap[res.id] || 0;
      const avgDaily = totalConsumed / baselineDays;
      const neededForForecast = avgDaily * forecastDays;
      const stockShortage = neededForForecast > res.stock ? neededForForecast - res.stock : 0;

      return {
        resource: res,
        avgDaily,
        neededForForecast,
        stockShortage,
      };
    }).filter((item) => item.stockShortage > 0);

    return forecastResults.sort((a, b) => b.stockShortage - a.stockShortage);
  }, [reports, resources, recipes, employees, forecastDays]);

  // Stocks Value calculations
  const rawMaterialsStockVal = useMemo(() => {
    return resources
      .filter((r) => r.bundle === 'materie_prima')
      .reduce((sum, r) => sum + r.stock * r.currentPrice, 0);
  }, [resources]);

  const spicesStockVal = useMemo(() => {
    return resources
      .filter((r) => r.bundle === 'condiment')
      .reduce((sum, r) => sum + r.stock * r.currentPrice, 0);
  }, [resources]);

  const productsStockVal = useMemo(() => {
    return products.reduce((sum, p) => {
      const rep = reports.find((r) => r.productId === p.id);
      const salePrice = rep ? rep.sellingPriceReal : 100; // fallback to 100 Lei
      return sum + p.stock * salePrice;
    }, 0);
  }, [products, reports]);

  // Generate SVG Chart Data dynamically
  const chartData = useMemo(() => {
    if (filteredReports.length === 0) return [];
    // Group reports by date
    const grouped: { [date: string]: { income: number; cost: number; profit: number } } = {};
    filteredReports.forEach((rep) => {
      const dateStr = rep.date;
      if (!grouped[dateStr]) {
        grouped[dateStr] = { income: 0, cost: 0, profit: 0 };
      }
      grouped[dateStr].income += rep.income;
      grouped[dateStr].cost += rep.calculatedTotalCostInput;
      grouped[dateStr].profit += rep.profit;
    });

    return Object.keys(grouped)
      .sort()
      .map((date) => ({
        date,
        ...grouped[date],
      }));
  }, [filteredReports]);

  return (
    <div id="dashboard-container" className="space-y-8 animate-fadeIn">
      {/* Dashboard Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-stone-900/40 p-4 rounded-xl border border-amber-900/10 gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-stone-100 flex items-center space-x-2">
            <Layers className="h-5 w-5 text-amber-500" />
            <span>Tablou de Bord (Principala)</span>
          </h2>
          <p className="text-xs text-stone-400">Vizualizare de ansamblu a producției, cheltuielilor și stocurilor active.</p>
        </div>

        {/* Period Filter & Grid/Chart Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selection */}
          <div className="flex bg-stone-950 p-1 rounded-lg border border-amber-900/20">
            {[
              { id: '7_zile', label: '7 Zile' },
              { id: '30_zile', label: '30 Zile' },
              { id: '90_zile', label: '90 Zile' },
              { id: 'tot', label: 'Toate' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as PeriodFilter)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  period === p.id 
                    ? 'bg-amber-600 text-stone-950 font-bold' 
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Table/Chart Switcher */}
          <div className="flex bg-stone-950 p-1 rounded-lg border border-amber-900/20">
            <button
              onClick={() => setViewMode('grafic')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grafic' 
                  ? 'bg-amber-600 text-stone-950' 
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Afișare Grafice"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('tabel')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'tabel' 
                  ? 'bg-amber-600 text-stone-950' 
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Afișare Tabele"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 1: KPI Widgets (Producere, Cheltuieli, Profit) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI: Producere */}
        <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-400">Producere (Venit)</span>
            <p className="text-3xl font-extrabold font-mono text-stone-100">
              {financialTotals.producere.toFixed(2)} <span className="text-sm font-sans font-medium text-stone-400">MDL</span>
            </p>
            <div className="flex items-center space-x-1 text-[11px] text-green-400 font-mono">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Valoare loturi procesate</span>
            </div>
          </div>
          <div className="bg-green-950/50 p-4 rounded-xl border border-green-800/30 text-green-400">
            <DollarSign className="h-8 w-8" />
          </div>
        </div>

        {/* KPI: Cheltuieli */}
        <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-400">Cheltuieli Producție</span>
            <p className="text-3xl font-extrabold font-mono text-stone-100">
              {financialTotals.cheltuieli.toFixed(2)} <span className="text-sm font-sans font-medium text-stone-400">MDL</span>
            </p>
            <div className="flex items-center space-x-1 text-[11px] text-red-400 font-mono">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Ingrediente, regie &amp; manoperă</span>
            </div>
          </div>
          <div className="bg-red-950/50 p-4 rounded-xl border border-red-800/30 text-red-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
        </div>

        {/* KPI: Profit */}
        <div className="bg-stone-900 rounded-xl border border-amber-600/30 p-6 flex items-center justify-between shadow-lg relative overflow-hidden ring-1 ring-amber-500/10">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/15 to-transparent rounded-bl-full pointer-events-none" />
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500 font-semibold">Profit Net Estimat</span>
            <p className="text-3xl font-extrabold font-mono text-amber-500">
              {financialTotals.profit.toFixed(2)} <span className="text-sm font-sans font-medium text-amber-600">MDL</span>
            </p>
            <div className="flex items-center space-x-1 text-[11px] text-amber-400 font-mono">
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              <span>Marjă: {financialTotals.producere > 0 ? ((financialTotals.profit / financialTotals.producere) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
          <div className="bg-amber-950/50 p-4 rounded-xl border border-amber-700/30 text-amber-500">
            <TrendingUp className="h-8 w-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Conditional Chart / Report Table */}
      {viewMode === 'grafic' ? (
        <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 shadow-md">
          <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-stone-300 mb-6 flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            <span>Grafic Evoluție Financiară (Pe Zile de Producție)</span>
          </h3>

          {chartData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-stone-500 border border-dashed border-stone-800 rounded-lg">
              <Calendar className="h-8 w-8 text-stone-600 mb-2" />
              <p className="text-xs">Nu există date suficiente în perioada selectată pentru a genera graficul.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Responsive SVG Chart */}
              <div className="relative w-full h-64">
                <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="580" y2="20" stroke="#292524" strokeWidth="1" />
                  <line x1="40" y1="70" x2="580" y2="70" stroke="#292524" strokeWidth="1" />
                  <line x1="40" y1="120" x2="580" y2="120" stroke="#292524" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="40" y1="170" x2="580" y2="170" stroke="#292524" strokeWidth="1" />
                  <line x1="40" y1="210" x2="580" y2="210" stroke="#44403c" strokeWidth="1" />

                  {/* Render Columns/Bars for Income, Cost and Profit */}
                  {chartData.map((data, index) => {
                    const totalBars = chartData.length;
                    const containerWidth = 540;
                    const colWidth = Math.min(25, (containerWidth / totalBars) * 0.3);
                    const colGap = (containerWidth / totalBars);
                    const x = 50 + index * colGap;

                    // Calculate max value for scaling
                    const maxVal = Math.max(...chartData.map(d => Math.max(d.income, d.cost)));
                    const scaleY = maxVal > 0 ? 180 / maxVal : 1;

                    const barHeightIncome = data.income * scaleY;
                    const barHeightCost = data.cost * scaleY;
                    const barHeightProfit = data.profit * scaleY;

                    return (
                      <g key={data.date}>
                        {/* Income Bar (Green) */}
                        <rect
                          x={x - colWidth - 2}
                          y={210 - barHeightIncome}
                          width={colWidth}
                          height={barHeightIncome}
                          fill="#10b981"
                          rx="2"
                          className="transition-all duration-300 hover:opacity-80"
                        />
                        {/* Cost Bar (Red) */}
                        <rect
                          x={x}
                          y={210 - barHeightCost}
                          width={colWidth}
                          height={barHeightCost}
                          fill="#ef4444"
                          rx="2"
                          className="transition-all duration-300 hover:opacity-80"
                        />
                        {/* Profit Bar (Amber) */}
                        <rect
                          x={x + colWidth + 2}
                          y={210 - Math.max(0, barHeightProfit)}
                          width={colWidth}
                          height={Math.max(1, barHeightProfit)}
                          fill="#f59e0b"
                          rx="2"
                          className="transition-all duration-300 hover:opacity-80"
                        />
                        {/* Date label */}
                        <text
                          x={x}
                          y="228"
                          fill="#a8a29e"
                          fontSize="7"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {data.date.substring(5)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div className="flex justify-center items-center space-x-6 text-xs text-stone-400">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-green-500 inline-block" />
                  <span>Producere (Venit)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-red-500 inline-block" />
                  <span>Cheltuieli</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block" />
                  <span>Profit Net</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 shadow-md overflow-x-auto">
          <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-stone-300 mb-4 flex items-center space-x-2">
            <Grid className="h-4 w-4 text-amber-500" />
            <span>Raport Agregat Detaliat (Dări de Seamă)</span>
          </h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Nume Lot</th>
                <th className="py-3 px-4">Dată</th>
                <th className="py-3 px-4 text-right">Cantitate Intrare (kg)</th>
                <th className="py-3 px-4 text-right">Cantitate Ieșire (kg/buc)</th>
                <th className="py-3 px-4 text-right">Cost Total (MDL)</th>
                <th className="py-3 px-4 text-right">Preț Vânzare Real (MDL)</th>
                <th className="py-3 px-4 text-right">Venit (MDL)</th>
                <th className="py-3 px-4 text-right">Profit (MDL)</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">Nu există loturi înregistrate în perioada selectată.</td>
                </tr>
              ) : (
                filteredReports.map((rep) => (
                  <tr key={rep.id} className="border-b border-stone-800/40 hover:bg-stone-800/20 transition-all">
                    <td className="py-3 px-4 font-semibold text-stone-200">{rep.name}</td>
                    <td className="py-3 px-4 font-mono text-stone-400">{rep.date}</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-300">{rep.inputQty.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-300">{rep.outputQty.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-400">{rep.calculatedTotalCostInput.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-stone-300">{rep.sellingPriceReal.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-green-400 font-bold">{rep.income.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-500 font-bold">{rep.profit.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Row 2: Stocks Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget: Produse Finale */}
        <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-300 flex items-center space-x-2">
                <Package className="h-4 w-4 text-amber-500" />
                <span>Stoc Produse Finale</span>
              </h4>
              <span className="text-xs font-mono text-amber-500 font-semibold">{productsStockVal.toFixed(2)} MDL</span>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {products.map((prod) => {
                const rep = reports.find((r) => r.productId === prod.id);
                const salePrice = rep ? rep.sellingPriceReal : 100;
                const totalVal = prod.stock * salePrice;
                const recipe = recipes.find(r => r.id === prod.recipeId);
                const isCanned = recipe?.baseUnit === 'buc';

                return (
                  <div key={prod.id} className="flex items-center justify-between text-xs hover:bg-stone-800/20 p-1.5 rounded transition-all">
                    <div>
                      <p className="font-semibold text-stone-200">{prod.label}</p>
                      <span className="text-[10px] text-stone-500 font-mono">Retetă: {recipe?.label || 'Custom'}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-stone-100">{prod.stock} <span className="text-[10px] text-stone-400">{isCanned ? 'buc' : 'kg'}</span></p>
                      <p className="text-[10px] text-stone-500 font-mono">{totalVal.toFixed(1)} MDL</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => setActiveTab('produse_finale')}
            className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold transition-all group pt-3 border-t border-stone-800/60"
          >
            <span>Gestionează Produsele</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Widget: Materie Prima */}
        <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-300 flex items-center space-x-2">
                <Beef className="h-4 w-4 text-amber-500" />
                <span>Stoc Materie Primă</span>
              </h4>
              <span className="text-xs font-mono text-amber-500 font-semibold">{rawMaterialsStockVal.toFixed(2)} MDL</span>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {resources
                .filter((r) => r.bundle === 'materie_prima')
                .map((res) => {
                  const totalVal = res.stock * res.currentPrice;
                  return (
                    <div key={res.id} className="flex items-center justify-between text-xs hover:bg-stone-800/20 p-1.5 rounded transition-all">
                      <div>
                        <p className="font-semibold text-stone-200">{res.label}</p>
                        <span className="text-[10px] text-stone-500 font-mono">{res.currentPrice.toFixed(1)} MDL/{res.unit}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-stone-100">{res.stock.toFixed(1)} <span className="text-[10px] text-stone-400">{res.unit}</span></p>
                        <p className="text-[10px] text-stone-500 font-mono">{totalVal.toFixed(1)} MDL</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <button
            onClick={() => setActiveTab('materia_prima')}
            className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold transition-all group pt-3 border-t border-stone-800/60"
          >
            <span>Achiziții &amp; Intrări Carne</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Widget: Condimente */}
        <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-stone-300 flex items-center space-x-2">
                <Sprout className="h-4 w-4 text-amber-500" />
                <span>Stoc Condimente</span>
              </h4>
              <span className="text-xs font-mono text-amber-500 font-semibold">{spicesStockVal.toFixed(2)} MDL</span>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {resources
                .filter((r) => r.bundle === 'condiment')
                .slice(0, 10) // show top spices
                .map((res) => {
                  const totalVal = res.stock * res.currentPrice;
                  return (
                    <div key={res.id} className="flex items-center justify-between text-xs hover:bg-stone-800/20 p-1.5 rounded transition-all">
                      <div>
                        <p className="font-semibold text-stone-200">{res.label}</p>
                        <span className="text-[10px] text-stone-500 font-mono">{res.currentPrice.toFixed(1)} MDL/{res.unit}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-stone-100">{res.stock.toFixed(2)} <span className="text-[10px] text-stone-400">{res.unit}</span></p>
                        <p className="text-[10px] text-stone-500 font-mono">{totalVal.toFixed(1)} MDL</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <button
            onClick={() => setActiveTab('condimente')}
            className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold transition-all group pt-3 border-t border-stone-800/60"
          >
            <span>Vezi Toate Condimentele</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Row 3: Ce ar trebui de cumpărat (Smart Shopping list) */}
      <div className="bg-stone-900 rounded-xl border border-amber-900/20 p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800 pb-4 gap-4">
          <div className="flex items-start space-x-3">
            <div className="bg-amber-950/50 border border-amber-500/20 text-amber-500 p-2 rounded-lg mt-0.5">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-sans text-stone-200">
                Ce ar trebui de cumpărat? (Aprovizionare Inteligentă)
              </h4>
              <p className="text-xs text-stone-400">
                Necesar calculat automat pe baza mediei consumului istoric de condimente și utilități din loturile încheiate.
              </p>
            </div>
          </div>

          {/* Slider for forecast window */}
          <div className="flex items-center space-x-3 bg-stone-950/60 py-1.5 px-3 rounded-lg border border-amber-900/10">
            <span className="text-xs text-stone-400 font-medium">Fereastră prognoză:</span>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={forecastDays}
              onChange={(e) => setForecastDays(Number(e.target.value))}
              className="w-24 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-amber-500 w-12 text-right">{forecastDays} Zile</span>
          </div>
        </div>

        {forecastItems.length === 0 ? (
          <div className="py-8 text-center text-stone-500 text-xs">
            🎉 Stocurile actuale de condimente și cheltuieli acoperă prognoza de {forecastDays} zile bazată pe consumul mediu.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecastItems.map((item) => (
              <div 
                key={item.resource.id} 
                className="bg-stone-950/50 rounded-lg p-4 border border-stone-800 hover:border-amber-900/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-200">{item.resource.label}</span>
                    <span className="px-2 py-0.5 bg-amber-950/60 text-amber-500 font-mono text-[10px] rounded-full border border-amber-500/10 font-semibold uppercase">
                      Lipsă: {item.stockShortage.toFixed(2)} {item.resource.unit}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-[11px] text-stone-400 font-mono">
                    <div className="flex justify-between">
                      <span>Stoc Curent:</span>
                      <span className="text-stone-300 font-medium">{item.resource.stock.toFixed(2)} {item.resource.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consum Mediu Zilnic:</span>
                      <span className="text-stone-300">{item.avgDaily.toFixed(3)} {item.resource.unit}/zi</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Necesar {forecastDays} Zile:</span>
                      <span className="text-amber-500 font-bold">{item.neededForForecast.toFixed(2)} {item.resource.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Quick replenish button */}
                <div className="mt-3 pt-3 border-t border-stone-900/60 flex items-center justify-between">
                  <span className="text-[10px] text-stone-500 font-mono">Cost Estimat: {(item.stockShortage * item.resource.currentPrice).toFixed(1)} MDL</span>
                  <button
                    onClick={() => {
                      // Prompt user for quantity to buy
                      const buyQtyStr = prompt(`Adaugă stoc pentru ${item.resource.label}. Cantitate sugerată lipsă: ${item.stockShortage.toFixed(2)} ${item.resource.unit}. Introdu cantitatea de achiziție:`, item.stockShortage.toFixed(2));
                      if (buyQtyStr) {
                        const buyQty = parseFloat(buyQtyStr);
                        if (!isNaN(buyQty) && buyQty > 0) {
                          onAddStock(item.resource.id, buyQty);
                          alert(`S-a adăugat ${buyQty} ${item.resource.unit} de ${item.resource.label} în stoc!`);
                        }
                      }
                    }}
                    className="flex items-center space-x-1 text-[11px] bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-2 py-1 rounded transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Aprovizionează</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
