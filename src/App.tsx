import React, { useState, useEffect } from "react";
import { Flame, Shield, AlertTriangle } from "lucide-react";

// Core domain components
import Header from "./components/Header";
import SpicesManager from "./components/SpicesManager";
import RawMaterialsManager from "./components/RawMaterialsManager";
import ExpensesManager from "./components/ExpensesManager";
import ProductsManager from "./components/ProductsManager";
import StaffManager from "./components/StaffManager";
import RecipesManager from "./components/RecipesManager";
import Calculator from "./components/Calculator";
import ReportsManager from "./components/ReportsManager";
import PartiesManager from "./components/PartiesManager";
import ProductionJobsManager from "./components/ProductionJobsManager";
import ProductionDashboard from "./components/ProductionDashboard";

import {
  Category,
  Resource,
  Employee,
  Recipe,
  FinalProduct,
  ProductionReport,
  StockMovement,
  Party,
  ProductionJob,
} from "./types";
import {
  authApi,
  boardApi,
  catalogApi,
  partyApi,
  productionJobApi,
} from "./services/desktopApi";
import { ApiError } from "./services/apiClient";

export default function App() {
  // Navigation & Role states
  const [activeTab, setActiveTab] = useState<string>("principala");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(authApi.hasToken());
  const [dataLoading, setDataLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Master persistent states
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [products, setProducts] = useState<FinalProduct[]>([]);
  const [reports, setReports] = useState<ProductionReport[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);

  const roleFromApi = (roles: string[]) =>
    roles.includes("administrator") || roles.includes("admin")
      ? "admin"
      : "operator";

  const loadCatalog = async () => {
    setDataLoading(true);
    setApiError(null);
    try {
      const [
        apiCategories,
        apiRecipes,
        apiProducts,
        apiResources,
        apiEmployees,
        apiReports,
        apiMovements,
      ] = await Promise.all([
        catalogApi.categories(),
        catalogApi.recipes(),
        catalogApi.products(),
        boardApi.resources(),
        boardApi.employees(),
        boardApi.reports(),
        boardApi.movements(),
      ]);
      setCategories(apiCategories);
      setRecipes(apiRecipes);
      setProducts(apiProducts);
      setResources(apiResources);
      setEmployees(apiEmployees);
      setReports(apiReports);
      setMovements(apiMovements);
      const [partyResult, jobResult] = await Promise.allSettled([
        partyApi.list(),
        productionJobApi.list(),
      ]);
      if (partyResult.status === "fulfilled") setParties(partyResult.value);
      if (jobResult.status === "fulfilled") setProductionJobs(jobResult.value);
      if (
        partyResult.status === "rejected" ||
        jobResult.status === "rejected"
      ) {
        setApiError(
          "Modulele Parteneri/Loturi așteaptă endpoint-urile noi din Instrucțiunea 2 BE. Restul datelor au fost încărcate.",
        );
      }
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Datele nu au putut fi încărcate.",
      );
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authApi.hasToken()) return;
    authApi
      .me()
      .then((user) => setUserRole(roleFromApi(user.roles)))
      .catch(() => authApi.logout().catch(() => undefined))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (userRole) void loadCatalog();
  }, [userRole]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setApiError(null);
    try {
      const user = await authApi.login(username.trim(), password);
      setUserRole(roleFromApi(user.roles));
      setPassword("");
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Autentificarea a eșuat.";
      setApiError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await authApi.logout().catch(() => undefined);
    setUserRole(null);
    setCategories([]);
    setResources([]);
    setRecipes([]);
    setEmployees([]);
    setProducts([]);
    setReports([]);
    setMovements([]);
    setParties([]);
    setProductionJobs([]);
    setApiError(null);
  };

  // --- CRUD HANDLERS ---

  // 1. Spices & Raw Materials (Resources)
  const handleAddResource = async (newRes: Omit<Resource, "id">) => {
    try {
      const resource = await boardApi.createResource(newRes);
      setResources((prev) => [...prev, resource]);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Resursa nu a putut fi salvată.",
      );
    }
  };

  const handleEditResource = async (id: string, updated: Partial<Resource>) => {
    try {
      const resource = await boardApi.updateResource(id, updated);
      setResources((prev) => prev.map((r) => (r.id === id ? resource : r)));
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Resursa nu a putut fi actualizată.",
      );
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await boardApi.deleteResource(id);
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Resursa nu a putut fi ștearsă.",
      );
    }
  };

  const handleAddStock = async (
    resourceId: string,
    qty: number,
    priceUnit?: number,
  ) => {
    try {
      const result = await boardApi.adjustStock(resourceId, {
        type: "intrare",
        quantity: qty,
        priceUnit,
        date: new Date().toISOString().split("T")[0],
        source: "Aprovizionare manuală stoc",
      });
      setResources((prev) =>
        prev.map((r) => (r.id === resourceId ? result.resource : r)),
      );
      setMovements((prev) => [result.movement, ...prev]);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Intrarea în stoc nu a putut fi salvată.",
      );
    }
  };

  const handleRemoveStock = async (resourceId: string, qty: number) => {
    try {
      const result = await boardApi.adjustStock(resourceId, {
        type: "iesire",
        quantity: qty,
        date: new Date().toISOString().split("T")[0],
        source: "Scădere manuală stoc",
      });
      setResources((prev) =>
        prev.map((r) => (r.id === resourceId ? result.resource : r)),
      );
      setMovements((prev) => [result.movement, ...prev]);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Ieșirea din stoc nu a putut fi salvată.",
      );
    }
  };

  // 2. Final Products
  const handleAddProduct = async (
    newProd: Omit<FinalProduct, "id" | "stock">,
  ) => {
    try {
      const product = await catalogApi.createProduct(newProd);
      setProducts((prev) => [...prev, product]);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Produsul nu a putut fi salvat.",
      );
    }
  };

  const handleEditProduct = async (
    id: string,
    updated: Partial<FinalProduct>,
  ) => {
    try {
      await catalogApi.updateProduct(id, updated);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      );
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Produsul nu a putut fi actualizat.",
      );
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await catalogApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Produsul nu a putut fi șters.",
      );
    }
  };

  const handleReduceProductStock = async (id: string, qty: number) => {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    await handleEditProduct(id, { stock: Math.max(0, product.stock - qty) });
  };

  // 3. Employees
  const handleAddEmployee = async (
    newEmp: Omit<Employee, "id" | "totalPaid">,
  ) => {
    try {
      const employee = await boardApi.createEmployee(newEmp);
      setEmployees((prev) => [...prev, employee]);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Angajatul nu a putut fi salvat.",
      );
    }
  };

  const handleEditEmployee = async (id: string, updated: Partial<Employee>) => {
    try {
      const employee = await boardApi.updateEmployee(id, updated);
      setEmployees((prev) => prev.map((e) => (e.id === id ? employee : e)));
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Angajatul nu a putut fi actualizat.",
      );
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const employee = await boardApi.deleteEmployee(id);
      setEmployees((prev) => prev.map((e) => (e.id === id ? employee : e)));
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Angajatul nu a putut fi dezactivat.",
      );
    }
  };

  const handlePayEmployee = async (id: string, amount: number) => {
    try {
      const result = await boardApi.payEmployee(id, amount);
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? result.employee : e)),
      );
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Plata nu a putut fi salvată.",
      );
    }
  };

  // 4. Recipes
  const handleAddRecipe = async (newRec: Omit<Recipe, "id">) => {
    try {
      const recipe = await catalogApi.createRecipe(newRec);
      setRecipes((prev) => [...prev, recipe]);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Rețeta nu a putut fi salvată.",
      );
    }
  };

  const handleEditRecipe = async (id: string, updated: Partial<Recipe>) => {
    try {
      const current = recipes.find((recipe) => recipe.id === id);
      await catalogApi.updateRecipe(id, { ...current, ...updated });
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updated } : r)),
      );
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Rețeta nu a putut fi actualizată.",
      );
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await catalogApi.deleteRecipe(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Rețeta nu a putut fi ștearsă.",
      );
    }
  };

  // 5. Production reports. Finalization and stock mutations are atomic on BE.
  const handleAddReport = async (newRep: Omit<ProductionReport, "id">) => {
    try {
      const report = await boardApi.createReport(newRep);
      setReports((prev) => [report, ...prev]);
      if (report.status === "finalizat") await loadCatalog();
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Darea de seamă nu a putut fi salvată.",
      );
    }
  };

  const handleEditReport = async (
    id: string,
    updated: Partial<ProductionReport>,
  ) => {
    try {
      const report = await boardApi.updateReport(id, updated);
      setReports((prev) => prev.map((r) => (r.id === id ? report : r)));
      if (report.status === "finalizat") await loadCatalog();
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Darea de seamă nu a putut fi actualizată.",
      );
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (reports.find((report) => report.id === id)?.status === "finalizat") {
      setApiError(
        "O dare de seamă finalizată nu poate fi ștearsă, deoarece stocurile au fost deja contabilizate.",
      );
      return;
    }
    try {
      await boardApi.deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Darea de seamă nu a putut fi ștearsă.",
      );
    }
  };

  // --- LOCK SCREEN RENDERING ---
  if (!userRole) {
    return (
      <div
        id="lock-screen-wrapper"
        className="min-h-screen bg-stone-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-amber-500 selection:text-stone-950"
      >
        {/* Abstract background blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-amber-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-red-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="bg-stone-900 border border-amber-900/20 max-w-md w-full rounded-2xl p-8 shadow-2xl space-y-8 animate-scaleIn relative z-10">
          <div className="text-center space-y-3">
            <div className="mx-auto bg-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center text-stone-950 shadow-lg shadow-amber-950/40">
              <Flame className="h-9 w-9 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-sans text-stone-100">
                Afumături de la Nanu
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Sistem securizat pentru planificare rețete și calcul producție
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <p className="text-[10px] uppercase tracking-wider text-amber-500 font-mono text-center font-bold">
              Autentificare Drupal
            </p>
            <label className="block text-xs text-stone-400">
              Utilizator sau email
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete="username"
                className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-500"
              />
            </label>
            <label className="block text-xs text-stone-400">
              Parolă
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="mt-2 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-stone-100 outline-none focus:border-amber-500"
              />
            </label>
            {apiError && (
              <p className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs text-red-300">
                {apiError}
              </p>
            )}
            <button
              id="btn-login"
              type="submit"
              disabled={authLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-bold text-stone-950 disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              {authLoading ? "Se verifică…" : "Autentificare"}
            </button>
          </form>

          <p className="text-[10px] text-center text-stone-600 font-mono">
            v1.2.0 • Proiectat pentru conformitate cu normele de siguranță
            alimentară
          </p>
        </div>
      </div>
    );
  }

  // --- TAB NAVIGATION RENDERING ---
  const renderContent = () => {
    switch (activeTab) {
      case "principala":
        return (
          <ProductionDashboard
            jobs={productionJobs}
            products={products}
            resources={resources}
            setActiveTab={setActiveTab}
          />
        );
      case "calculator":
        return (
          <Calculator
            products={products}
            recipes={recipes}
            resources={resources}
            employees={employees}
          />
        );
      case "retete":
        return (
          <RecipesManager
            recipes={recipes}
            resources={resources}
            employees={employees}
            categories={categories}
            onAddRecipe={handleAddRecipe}
            onEditRecipe={handleEditRecipe}
            onDeleteRecipe={handleDeleteRecipe}
          />
        );
      case "loturi_productie":
        return (
          <ProductionJobsManager
            jobs={productionJobs}
            parties={parties}
            products={products}
            recipes={recipes}
            resources={resources}
            onChanged={async (reloadStock) => {
              const [newJobs, newParties] = await Promise.all([
                productionJobApi.list(),
                partyApi.list(),
              ]);
              setProductionJobs(newJobs);
              setParties(newParties);
              if (reloadStock) {
                const [newResources, newProducts] = await Promise.all([
                  boardApi.resources(),
                  catalogApi.products(),
                ]);
                setResources(newResources);
                setProducts(newProducts);
              }
            }}
            onError={setApiError}
          />
        );
      case "parteneri":
        return (
          <PartiesManager
            parties={parties}
            jobs={productionJobs}
            onChanged={async () => {
              const [newParties, newJobs] = await Promise.all([
                partyApi.list(),
                productionJobApi.list(),
              ]);
              setParties(newParties);
              setProductionJobs(newJobs);
            }}
            onError={setApiError}
          />
        );
      case "dari_de_seama":
        return (
          <ReportsManager
            reports={reports}
            products={products}
            recipes={recipes}
            resources={resources}
            employees={employees}
            onAddReport={handleAddReport}
            onEditReport={handleEditReport}
            onDeleteReport={handleDeleteReport}
          />
        );
      case "materia_prima":
        return (
          <RawMaterialsManager
            resources={resources}
            onAddResource={(res) =>
              handleAddResource({ ...res, bundle: "materie_prima" })
            }
            onEditResource={handleEditResource}
            onDeleteResource={handleDeleteResource}
            onAddStock={handleAddStock}
            onRemoveStock={handleRemoveStock}
          />
        );
      case "condimente":
        return (
          <SpicesManager
            resources={resources}
            onAddResource={(res) =>
              handleAddResource({ ...res, bundle: "condiment" })
            }
            onEditResource={handleEditResource}
            onDeleteResource={handleDeleteResource}
            onAddStock={handleAddStock}
            onRemoveStock={handleRemoveStock}
          />
        );
      case "alte_cheltuieli":
        return (
          <ExpensesManager
            resources={resources}
            onAddResource={(res) =>
              handleAddResource({ ...res, bundle: "alta_cheltuiala" })
            }
            onEditResource={handleEditResource}
            onDeleteResource={handleDeleteResource}
          />
        );
      case "munca_personalului":
        return (
          <StaffManager
            employees={employees}
            recipes={recipes}
            onAddEmployee={handleAddEmployee}
            onEditEmployee={handleEditEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onPayEmployee={handlePayEmployee}
          />
        );
      case "produse_finale":
        return (
          <ProductsManager
            products={products}
            recipes={recipes}
            reports={reports}
            allResources={resources}
            allEmployees={employees}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onReduceStock={handleReduceProductStock}
          />
        );
      default:
        return (
          <div className="text-center py-12 text-stone-400">
            Modul în curs de dezvoltare...
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 selection:bg-amber-500 selection:text-stone-950 flex flex-col font-sans">
      {/* Header component */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        onLogout={handleLogout}
      />

      {/* Main app grid area */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {apiError && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-950/40 p-4 text-xs text-red-300">
            <span>{apiError}</span>
            <button
              onClick={() => void loadCatalog()}
              className="font-bold text-amber-500"
            >
              Reîncearcă
            </button>
          </div>
        )}
        {dataLoading && (
          <div className="mb-6 text-center text-sm text-amber-500">
            Se încarcă datele din Drupal…
          </div>
        )}
        {/* Alert badge if user is Operator and tries admin tabs */}
        {userRole === "operator" &&
          [
            "retete",
            "materia_prima",
            "condimente",
            "alte_cheltuieli",
            "munca_personalului",
          ].includes(activeTab) && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400 text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">Mod de vizualizare restricționat!</p>
                <p className="text-stone-400">
                  Sunteți conectat ca Operator Secție. Opțiunile de
                  adăugare/editare/ștergere sunt dezactivate pentru rolul
                  dumneavoastră.
                </p>
              </div>
            </div>
          )}

        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-stone-900/30 border-t border-stone-900 py-6 text-center text-[11px] font-mono text-stone-600 mt-12">
        <p>
          © 2026 Afumături de la Nanu. Proiectat pentru producție optimizată.
        </p>
      </footer>
    </div>
  );
}
