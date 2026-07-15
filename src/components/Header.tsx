import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Calculator, 
  ScrollText, 
  FileSpreadsheet, 
  Beef, 
  Sprout, 
  Coins, 
  Users, 
  Package, 
  LogOut,
  Menu,
  X,
  Flame
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: string;
  onLogout: () => void;
}

export default function Header({ activeTab, setActiveTab, userRole, onLogout }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'principala', label: 'Principala', icon: LayoutDashboard },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
    { id: 'retete', label: 'Rețete', icon: ScrollText },
    { id: 'dari_de_seama', label: 'Darea de Seamă', icon: FileSpreadsheet },
    { id: 'materia_prima', label: 'Materia Primă', icon: Beef },
    { id: 'condimente', label: 'Condimente', icon: Sprout },
    { id: 'alte_cheltuieli', label: 'Alte Cheltuieli', icon: Coins },
    { id: 'munca_personalului', label: 'Munca Personalului', icon: Users },
    { id: 'produse_finale', label: 'Produse Finale', icon: Package },
  ];

  return (
    <header id="app-header" className="bg-stone-900 border-b border-amber-900/30 text-stone-100 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('principala')}>
            <div className="bg-amber-600 p-2 rounded-lg text-stone-950 flex items-center justify-center shadow-inner">
              <Flame className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight font-sans text-stone-50">
                Afumături de la Nanu
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-amber-500 font-mono font-medium">
                Sistem Gestiune Producție
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex space-x-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`nav-link-${item.id}`}
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-amber-600 text-stone-950 font-semibold shadow-sm' 
                      : 'text-stone-300 hover:bg-stone-800 hover:text-amber-500'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Info & Logout (Desktop) */}
          <div className="hidden xl:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-stone-200">{userRole === 'admin' ? 'Administrator' : 'Operator'}</p>
              <span className="text-[10px] text-amber-500 font-mono">Activ</span>
            </div>
            <button
              id="logout-button-desktop"
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-3 py-2 text-stone-300 hover:bg-red-950/40 hover:text-red-400 rounded-md text-xs font-medium transition-all"
              title="Ieși din program"
            >
              <LogOut className="h-4 w-4" />
              <span>Ieși</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="xl:hidden flex items-center space-x-3">
            <div className="text-right">
              <p className="text-xs font-medium text-stone-300">{userRole === 'admin' ? 'Admin' : 'Operator'}</p>
            </div>
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-stone-300 hover:text-amber-500 hover:bg-stone-800 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div id="mobile-menu" className="xl:hidden bg-stone-900 border-b border-amber-900/30 px-2 pt-2 pb-4 space-y-1 shadow-inner">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                id={`nav-link-mobile-${item.id}`}
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-md text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-amber-600 text-stone-950 font-bold' 
                    : 'text-stone-300 hover:bg-stone-800 hover:text-amber-500'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="border-t border-stone-800 pt-3 mt-3">
            <button
              id="logout-button-mobile"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:bg-red-950/20 rounded-md text-sm font-medium transition-all"
            >
              <LogOut className="h-5 w-5" />
              <span>Ieși din program</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
