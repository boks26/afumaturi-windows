import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Briefcase, 
  Flame, 
  Scale 
} from 'lucide-react';
import { Employee, Recipe } from '../types';

interface StaffManagerProps {
  employees: Employee[];
  recipes: Recipe[];
  onAddEmployee: (employee: Omit<Employee, 'id' | 'totalPaid'>) => void;
  onEditEmployee: (id: string, employee: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  onPayEmployee: (id: string, amount: number) => void;
}

export default function StaffManager({
  employees,
  recipes,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onPayEmployee,
}: StaffManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [rates, setRates] = useState<{ [recipeId: string]: number }>({});

  // Payment state
  const [payAmount, setPayAmount] = useState(0);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (e) => e.active && e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  // Available main recipes to define rates for
  const mainRecipes = useMemo(() => {
    return recipes.filter((r) => !r.isSubRecipe);
  }, [recipes]);

  const openCreate = () => {
    setName('');
    setRole('');
    // Initialize rates with 0 for all recipes
    const initialRates: { [recipeId: string]: number } = {};
    mainRecipes.forEach((r) => {
      initialRates[r.id] = 0;
    });
    setRates(initialRates);
    setIsCreateOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setName(emp.name);
    setRole(emp.role);
    // Merge existing employee rates with any new recipes that might have been added
    const mergedRates: { [recipeId: string]: number } = {};
    mainRecipes.forEach((r) => {
      mergedRates[r.id] = emp.rates[r.id] !== undefined ? emp.rates[r.id] : 0;
    });
    setRates(mergedRates);
    setIsEditOpen(true);
  };

  const openPay = (emp: Employee) => {
    setSelectedEmployee(emp);
    setPayAmount(200);
    setIsPayOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    onAddEmployee({
      name: name,
      role: role,
      rates: rates,
      active: true,
    });
    setIsCreateOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !name.trim() || !role.trim()) return;
    onEditEmployee(selectedEmployee.id, {
      name: name,
      role: role,
      rates: rates,
    });
    setIsEditOpen(false);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || payAmount <= 0) return;
    onPayEmployee(selectedEmployee.id, Number(payAmount));
    setIsPayOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Sigur doriți să ștergeți angajatul "${name}"? Istoricul plăților sale va fi arhivat.`)) {
      onDeleteEmployee(id);
    }
  };

  const handleRateChange = (recipeId: string, value: number) => {
    setRates((prev) => ({
      ...prev,
      [recipeId]: value,
    }));
  };

  return (
    <div id="staff-manager-container" className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-stone-900/40 p-4 rounded-xl border border-amber-900/10 gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans text-stone-100 flex items-center space-x-2">
            <Users className="h-5 w-5 text-amber-500" />
            <span>Munca Personalului (Salarizare &amp; Tarife)</span>
          </h2>
          <p className="text-xs text-stone-400">Gestiune angajați, plăți efectuate și tarife per kilogram (Lei/kg) pentru manopera fiecărui tip de produs final.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Caută angajat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-stone-950 text-stone-200 pl-9 pr-4 py-2 rounded-lg text-xs font-mono border border-amber-900/20 focus:outline-none focus:border-amber-500 w-44 sm:w-64"
            />
          </div>
          <button
            id="btn-create-employee"
            onClick={openCreate}
            className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold px-3 py-2 rounded-lg text-xs transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Adăugă Angajat</span>
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-stone-900 rounded-xl border border-amber-900/20 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-800 text-stone-400 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Nume Angajat</th>
                <th className="py-4 px-6">Funcție / Rol</th>
                <th className="py-4 px-6">Tarife Manoperă (Schiță)</th>
                <th className="py-4 px-6 text-right">Sumă Achitată Istoric</th>
                <th className="py-4 px-6">Data Ultimei Plăți</th>
                <th className="py-4 px-6 text-center">Plată Angajat</th>
                <th className="py-4 px-6 text-center">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500">Nu s-au găsit angajați înregistrați.</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-stone-800/40 hover:bg-stone-800/20 transition-all">
                    <td className="py-3.5 px-6 font-semibold text-stone-200 text-sm">{emp.name}</td>
                    <td className="py-3.5 px-6 text-stone-300 font-medium font-sans flex items-center space-x-1.5 pt-4">
                      <Briefcase className="h-3.5 w-3.5 text-stone-500" />
                      <span>{emp.role}</span>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-1 max-w-xs">
                        {Object.entries(emp.rates).map(([recId, rate]) => {
                          const rec = recipes.find((r) => r.id === recId);
                          const rateNum = Number(rate);
                          if (!rec || rateNum === 0) return null;
                          return (
                            <span key={recId} className="text-[10px] text-stone-400 font-mono flex justify-between bg-stone-950/40 px-1.5 py-0.5 rounded border border-stone-800/50">
                              <span>{rec.label}:</span>
                              <span className="text-amber-500 font-semibold">{rateNum.toFixed(2)} Lei/{rec.baseUnit}</span>
                            </span>
                          );
                        })}
                        {Object.values(emp.rates).every((r) => r === 0) && (
                          <span className="text-stone-500 italic text-[11px]">Niciun tarif configurat</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono text-green-400 font-bold">
                      {emp.totalPaid.toFixed(2)} <span className="text-[10px] text-stone-500">Lei</span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-stone-400">
                      {emp.lastPaidDate ? (
                        <span>{emp.lastPaidDate}</span>
                      ) : (
                        <span className="text-stone-600 italic">Nicio plată</span>
                      )}
                    </td>
                    {/* Pay Employee Action */}
                    <td className="py-3.5 px-6 text-center">
                      <button
                        id={`btn-pay-${emp.id}`}
                        onClick={() => openPay(emp)}
                        className="mx-auto flex items-center space-x-1 bg-stone-950 text-green-400 hover:bg-green-950/40 px-2 py-1 rounded text-[11px] font-mono border border-green-900/20 transition-all"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Achită salariu</span>
                      </button>
                    </td>
                    {/* CRUD Actions */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          id={`btn-edit-emp-${emp.id}`}
                          onClick={() => openEdit(emp)}
                          className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-stone-800 rounded transition-all"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`btn-delete-emp-${emp.id}`}
                          onClick={() => handleDelete(emp.id, emp.name)}
                          className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-800 rounded transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Creare Angajat */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <Plus className="text-amber-500 h-5 w-5" />
              <span>Creează Profil Angajat</span>
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Nume și Prenume</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Ion Crețu"
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Functie / Rol</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Tehnolog preparare"
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                </div>
              </div>

              {/* Configure rates for each recipe */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-amber-500 border-b border-stone-800 pb-1.5">
                  Tarif de plată manoperă (Plată per unitate produs)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {mainRecipes.map((r) => (
                    <div key={r.id} className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800 flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-300 w-1/2 truncate" title={r.label}>{r.label}</span>
                      <div className="flex items-center space-x-1.5 w-1/2 justify-end">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rates[r.id] || ''}
                          onChange={(e) => handleRateChange(r.id, Number(e.target.value))}
                          placeholder="0.00"
                          className="bg-stone-900 text-stone-100 text-right font-mono px-2 py-1 rounded border border-amber-900/10 focus:outline-none focus:border-amber-500 w-20"
                        />
                        <span className="text-[10px] text-stone-500 font-mono">Lei/{r.baseUnit}</span>
                      </div>
                    </div>
                  ))}
                  {mainRecipes.length === 0 && (
                    <p className="text-stone-500 italic col-span-2 py-2">Creați rețete principale pentru a le putea atribui tarife.</p>
                  )}
                </div>
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
                  Salvează Angajat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editare Angajat */}
      {isEditOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <Edit2 className="text-amber-500 h-4 w-4" />
              <span>Editează Profil Angajat: {selectedEmployee.name}</span>
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Nume și Prenume</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-400 block font-mono">Funcție / Rol</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                  />
                </div>
              </div>

              {/* Configure rates for each recipe */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-amber-500 border-b border-stone-800 pb-1.5">
                  Tarif de plată manoperă (Plată per unitate produs)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {mainRecipes.map((r) => (
                    <div key={r.id} className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800 flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-300 w-1/2 truncate" title={r.label}>{r.label}</span>
                      <div className="flex items-center space-x-1.5 w-1/2 justify-end">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rates[r.id] !== undefined ? rates[r.id] : ''}
                          onChange={(e) => handleRateChange(r.id, Number(e.target.value))}
                          placeholder="0.00"
                          className="bg-stone-900 text-stone-100 text-right font-mono px-2 py-1 rounded border border-amber-900/10 focus:outline-none focus:border-amber-500 w-20"
                        />
                        <span className="text-[10px] text-stone-500 font-mono">Lei/{r.baseUnit}</span>
                      </div>
                    </div>
                  ))}
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

      {/* Modal: Plată Angajat (Registru Salarii) */}
      {isPayOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold font-sans text-stone-100 flex items-center space-x-2 mb-4 border-b border-stone-800 pb-2">
              <DollarSign className="text-green-500 h-5 w-5" />
              <span>Achitare Salariu / Avans</span>
            </h3>

            <div className="bg-stone-950/50 p-3 rounded-lg border border-stone-800 text-xs font-mono mb-4 text-stone-400 space-y-1">
              <div className="flex justify-between">
                <span>Angajat:</span>
                <span className="text-stone-200 font-bold">{selectedEmployee.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total achitat istoric:</span>
                <span className="text-green-400 font-bold">{selectedEmployee.totalPaid.toFixed(2)} Lei</span>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-400 block font-mono">Sumă de achitat (Lei)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  placeholder="Suma în Lei"
                  className="bg-stone-950 text-stone-200 px-3 py-2 rounded-lg text-xs font-sans border border-amber-900/20 focus:outline-none focus:border-amber-500 w-full"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-all"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 text-stone-950 font-bold px-4 py-2 rounded-lg text-xs transition-all"
                >
                  Confirmă Plata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
