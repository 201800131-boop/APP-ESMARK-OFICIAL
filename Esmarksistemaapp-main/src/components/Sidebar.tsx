import React, { useState } from 'react';
import { 
  Home, 
  ShoppingCart, 
  FileText, 
  Package, 
  Calendar, 
  Settings, 
  LayoutDashboard,
  Wallet,
  Menu,
  X,
  Calculator, // ✨ NUEVO ICONO
  Layout, // ✨ Icono para Facturacion
  Users, // ✨ Icono para Clientes
  Moon // 📅 Icono mejorado para Cerrar Día
} from 'lucide-react';

interface User {
  name: string;
  role: 'admin' | 'operator';
  photo?: string;
}

interface SidebarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  user?: User;
  onLogout?: () => void;
}

export default function Sidebar({ currentView, onNavigate, user, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'orders-list', label: 'Pedidos', icon: ShoppingCart },
    { id: 'quotes-list', label: 'Cotizaciones', icon: FileText },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'petty-cash', label: 'Caja Chica', icon: Wallet },
    { id: 'price-calculator', label: 'Calculadora de Precios', icon: Calculator },
    { id: 'close-day', label: 'Cierre de Día', icon: Moon }, // 📅 Icono mejorado para Cerrar Día
  ];

  if (isAdmin) {
    menuItems.push({ id: 'templates', label: 'Facturacion', icon: Layout }); // ✨ AREA DE FACTURACION
    menuItems.push({ id: 'customers', label: 'Clientes', icon: Users }); // ✨ CLIENTES
    menuItems.push({ id: 'settings', label: 'Ajustes', icon: Settings });
  }

  const handleNavigate = (view: string) => {
    onNavigate(view);
    setIsOpen(false); // Cerrar sidebar en móvil después de navegar
  };

  return (
    <>
      {/* Botón hamburguesa para móvil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-md text-white rounded-lg shadow-lg hover:bg-white/20 transition-all border border-white/20"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`app-sidebar fixed lg:relative w-64 lg:w-full bg-slate-950 text-white flex flex-col h-screen lg:h-full shadow-xl border-r border-slate-800 transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="p-5">
        <div className="flex flex-col items-center mb-7 rounded-2xl bg-slate-900/80 p-4 border border-slate-800 shadow-lg">
          <div className="mb-3">
            <img 
              src="/logo.png" 
              alt="EsMark Media" 
              className="w-40 h-auto object-contain drop-shadow-lg"
              draggable={false}
            />
          </div>
          <div className="text-center">
            <p className="text-white/90 text-sm">Sistema de Gestión</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id || 
            (item.id === 'orders-list' && ['order-form', 'orders-list', 'delivery'].includes(currentView));
          
          // 📅 Estilo especial para "Cierre de Día"
          const isCloseDayButton = item.id === 'close-day';
          
          return (
            <button
              key={item.id}
              data-nav-active={isActive ? 'true' : 'false'}
              data-close-day={isCloseDayButton ? 'true' : 'false'}
              onClick={() => handleNavigate(item.id)}
              className={`app-sidebar-item w-full flex items-center space-x-3 px-4 py-3 rounded-xl mb-2 transition-all ${ isCloseDayButton ? isActive ? 'bg-blue-700 text-white shadow-lg border border-blue-500' : 'bg-slate-900 text-slate-100 hover:bg-blue-700 hover:text-white shadow-sm border border-slate-800' : isActive ? 'bg-white text-slate-950 border border-white shadow-lg' : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent' }`}
            >
              <Icon className="w-5 h-5" />
              <span className={isCloseDayButton ? 'font-semibold' : ''}>{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
    </>
  );
}
