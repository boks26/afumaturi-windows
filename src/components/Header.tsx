import React, { useEffect, useRef, useState } from "react";
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
  Flame,
  Moon,
  Sun,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import { Handshake } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: string;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  userRole,
  onLogout,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMoreOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) setIsMoreOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMoreOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMoreOpen]);

  const menuItems = [
    { id: "principala", label: "Principala", icon: LayoutDashboard },
    { id: "calculator", label: "Calculator", icon: Calculator },
    { id: "retete", label: "Rețete", icon: ScrollText },
    { id: "loturi_productie", label: "Loturi", icon: FileSpreadsheet },
    { id: "parteneri", label: "Parteneri", icon: Handshake },
    { id: "dari_de_seama", label: "Vânzări produse", icon: FileSpreadsheet },
    { id: "materia_prima", label: "Materia Primă", icon: Beef },
    { id: "condimente", label: "Condimente", icon: Sprout },
    { id: "alte_cheltuieli", label: "Alte Cheltuieli", icon: Coins },
    { id: "munca_personalului", label: "Munca Personalului", icon: Users },
    { id: "produse_finale", label: "Produse Finale", icon: Package },
  ];
  const primaryItems = menuItems.slice(0, 5);
  const secondaryItems = menuItems.slice(5);
  const activate = (id: string) => {
    setActiveTab(id);
    setIsOpen(false);
    setIsMoreOpen(false);
  };

  return (
    <header
      id="app-header"
      className="bg-stone-900 border-b border-amber-900/30 text-stone-100 sticky top-0 z-50 shadow-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 h-16">
          {/* Logo & Brand */}
          <div
            className="flex shrink-0 items-center space-x-2 cursor-pointer"
            onClick={() => activate("principala")}
          >
            <div className="bg-amber-600 p-2 rounded-lg text-stone-950 flex items-center justify-center shadow-inner">
              <Flame className="h-6 w-6 animate-pulse" />
            </div>
            <div className="hidden 2xl:block">
              <h1 className="text-sm font-bold tracking-tight font-sans text-stone-50">
                Afumături
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-amber-500 font-mono font-medium">
                Gestiune Producție
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`nav-link-${item.id}`}
                  key={item.id}
                  onClick={() => activate(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-amber-600 text-stone-950 font-semibold shadow-sm"
                      : "text-stone-300 hover:bg-stone-800 hover:text-amber-500"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="relative" ref={moreMenuRef}>
              <button id="nav-more-toggle" onClick={() => setIsMoreOpen((open) => !open)} aria-expanded={isMoreOpen} aria-haspopup="menu" className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all ${secondaryItems.some((item) => item.id === activeTab) ? "bg-amber-600 text-stone-950 shadow-sm" : "text-stone-300 hover:bg-stone-800 hover:text-amber-500"}`}>
                <MoreHorizontal className="h-4 w-4" /><span>Altele</span><ChevronDown className={`h-3 w-3 transition-transform ${isMoreOpen ? "rotate-180" : ""}`} />
              </button>
              {isMoreOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-stone-700 bg-stone-900 p-1.5 shadow-2xl ring-1 ring-black/5 animate-fadeIn">
                  <div className="px-3 pb-1.5 pt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-stone-500">Documente</div>
                  {secondaryItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return <React.Fragment key={item.id}>
                      {index === 1 && <div className="mx-2 mt-1 border-t border-stone-800 pt-2"><span className="px-1 text-[9px] font-bold uppercase tracking-[0.16em] text-stone-500">Stoc și operațiuni</span></div>}
                      <button role="menuitem" onClick={() => activate(item.id)} className={`group relative mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${isActive ? "bg-amber-950/50 font-semibold text-amber-500" : "text-stone-300 hover:bg-stone-800 hover:text-stone-100"}`}>
                        {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber-500" />}
                        <span className={`grid h-7 w-7 place-items-center rounded-md ${isActive ? "bg-amber-600 text-stone-950" : "bg-stone-800 text-stone-400 group-hover:text-amber-500"}`}><Icon className="h-3.5 w-3.5" /></span>
                        <span>{item.label}</span>
                      </button>
                    </React.Fragment>;
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* User Info & Logout (Desktop) */}
          <div className="hidden lg:flex shrink-0 items-center gap-2">
            <button onClick={onToggleTheme} className="grid h-9 w-9 place-items-center rounded-lg border border-stone-800 text-stone-400 transition-colors hover:border-amber-700 hover:bg-stone-800 hover:text-amber-500" title={theme === "dark" ? "Activează tema de zi" : "Activează tema de noapte"} aria-label="Schimbă tema">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex h-10 items-center rounded-xl border border-stone-800 bg-stone-950/40 pl-1.5 shadow-sm">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-600 text-xs font-bold text-stone-950" aria-hidden="true">
                {userRole === "admin" ? "A" : "O"}
              </div>
              <div className="min-w-[88px] px-2.5 leading-tight">
                <p className="text-[11px] font-semibold text-stone-200">{userRole === "admin" ? "Administrator" : "Operator"}</p>
                <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Activ</span>
              </div>
              <div className="h-5 w-px bg-stone-800" />
              <button id="logout-button-desktop" onClick={onLogout} className="mx-1 grid h-8 w-8 place-items-center rounded-lg text-stone-400 transition-colors hover:bg-red-950/40 hover:text-red-400" title="Ieși din program" aria-label="Ieși din program">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="ml-auto lg:hidden flex items-center space-x-2">
            <button onClick={onToggleTheme} className="p-2 rounded-md text-stone-300 hover:text-amber-500 hover:bg-stone-800" aria-label="Schimbă tema">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="text-right">
              <p className="text-xs font-medium text-stone-300">
                {userRole === "admin" ? "Admin" : "Operator"}
              </p>
            </div>
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-stone-300 hover:text-amber-500 hover:bg-stone-800 focus:outline-none"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden max-h-[calc(100vh-4rem)] overflow-y-auto bg-stone-900 border-b border-amber-900/30 px-2 pt-2 pb-4 space-y-1 shadow-inner"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                id={`nav-link-mobile-${item.id}`}
                key={item.id}
                onClick={() => {
                  activate(item.id);
                }}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-600 text-stone-950 font-bold"
                    : "text-stone-300 hover:bg-stone-800 hover:text-amber-500"
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
