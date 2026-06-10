import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import HomeView from "./components/HomeView";
import OrderFormView from "./components/Orders/OrderFormView";
import OrdersListView from "./components/Orders/OrdersListView";
import DeliveryView from "./components/Orders/DeliveryView";
import QuoteFormView from "./components/Quotes/QuoteFormView";
import QuotesListView from "./components/Quotes/QuotesListView";
import InventoryView from "./components/Inventory/InventoryView";
import CloseDayView from "./components/CloseDay/CloseDayView";
import SettingsView from "./components/Settings/SettingsView";
import PettyCashView from "./components/PettyCashView";
import PriceCalculator from "./components/PriceCalculator";
import FacturaArea from "./components/Facturacion/FacturaArea";
import CustomersView from "./components/Customers/CustomersView";
import DayReportView from "./components/WorkDays/DayReportView";
import LoginView from "./components/LoginView";
import DayStartView from "./components/DayStartView";
import LoginSplash from "./components/LoginSplash";
import SetupWizard from "./components/Setup/SetupWizard";
import { DayProvider } from "./contexts/DayContext";
import { connectedUsersManager } from "./utils/connected-users";
import { login as authLogin, logout as authLogout, getInitialSession } from "./utils/auth";
import { logUserLogin, logUserLogout, logTrelloSync } from "./utils/activity-logger";
import { getTrelloOrders } from "./utils/trello-orders";
import { api } from "./utils/api";
import { toast } from "sonner";
import { getCurrentWorkDay, getWorkDayDateKey, isPendingPreviousWorkDay } from "./utils/work-days-api";
import UpdateBanner from "./components/Updates/UpdateBanner";
import { isNotificationEnabled, shouldShowFloatingNotification } from "./utils/notification-settings";

type View =
  | "home"
  | "orders-menu"
  | "order-form"
  | "orders-list"
  | "delivery"
  | "quote-form"
  | "quotes-list"
  | "inventory"
  | "close-day"
  | "settings"
  | "petty-cash"
  | "templates"
  | "price-calculator"
  | "customers"
  | "work-days-history"
  | "day-report"
  | "activity-log";

interface ViewState {
  view: View;
  data?: any;
}

interface User {
  id: string;
  username: string;
  name: string;
  role: "admin" | "operator";
  photo?: string;
}

export default function App() {
  // Utilidad segura para parsear JSON desde localStorage
  const safeParse = (str: string | null, fallback: any = {}) => {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn("safeParse: JSON malformado en localStorage, usando fallback", e);
      return fallback;
    }
  };

const initialSession = getInitialSession();

const [user, setUser] = useState<User | null>(initialSession.user);
const [dayStarted, setDayStarted] = useState(false);
const [checkingDay, setCheckingDay] = useState(!!initialSession.user);
const [hydrating, setHydrating] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
const [checkingConfig, setCheckingConfig] = useState(true);
const [showLoginSplash, setShowLoginSplash] = useState(false);
const [viewState, setViewState] = useState<ViewState>({
  view: "home",
});

// Lock de sincronizacion: persiste entre renders sin forzar render extra.
const isSyncingRef = useRef(false);
const toastFilterInstalledRef = useRef(false);
const pendingCloseReminderRef = useRef<string | null>(null);
const loginSplashStartedAtRef = useRef(0);

  useEffect(() => {
    if (toastFilterInstalledRef.current) return;
    toastFilterInstalledRef.current = true;

    const toastApi = toast as any;
    if (toastApi.__esmarkNotificationFilterInstalled) return;
    toastApi.__esmarkNotificationFilterInstalled = true;

    (['success', 'info', 'warning', 'error', 'loading'] as const).forEach((method) => {
      const original = toastApi[method];
      if (typeof original !== 'function') return;

      toastApi[method] = (message: any, options?: any) => {
        if (!shouldShowFloatingNotification(message, options)) {
          return undefined;
        }
        return original(message, options);
      };
    });
  }, []);

  const syncTrelloToSupabase = async () => {
    const result = await getTrelloOrders();
    if (!result.success || !result.orders) {
      return { success: false, imported: 0, skipped: 0 };
    }

    const outcomes = await Promise.allSettled(result.orders.map((order) => api.upsertOrder(order)));
    const imported = outcomes.filter((outcome) => outcome.status === 'fulfilled').length;
    const skipped = outcomes.length - imported;
    return { success: true, imported, skipped };
  };

  // Si hay un dia abierto en Supabase, respetalo como iniciado.
  useEffect(() => {
    if (!user) {
      setDayStarted(false);
      setCheckingDay(false);
      return;
    }

    let mounted = true;
    setCheckingDay(true);
    getCurrentWorkDay()
      .then((day) => {
        if (!mounted) return;
        setDayStarted(!!day);
        if (isPendingPreviousWorkDay(day) && pendingCloseReminderRef.current !== day!.id) {
          pendingCloseReminderRef.current = day!.id;
          toast.warning('Tiene un cierre de dia pendiente', {
            id: `pending-close-${day!.id}`,
            description: `La jornada del ${getWorkDayDateKey(day!)} sigue abierta. Debe realizar el cierre antes de continuar con una nueva jornada.`,
            duration: 12000,
            mandatory: true,
            action: {
              label: 'Ir a cierre',
              onClick: () => navigateTo('close-day'),
            },
          } as any);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setDayStarted(false);
      })
      .finally(() => {
        if (!mounted) return;
        setCheckingDay(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    connectedUsersManager.connect({
      id: user.id,
      name: user.name,
      role: user.role,
      photo: user.photo,
    });

    return () => connectedUsersManager.disconnect();
  }, [user?.id, user?.name, user?.role, user?.photo]);

  useEffect(() => {
    if (!showLoginSplash || !user || checkingDay) return;

    const minimumSplashDuration = 1800;
    const elapsed = Date.now() - loginSplashStartedAtRef.current;
    const timeout = window.setTimeout(
      () => setShowLoginSplash(false),
      Math.max(0, minimumSplashDuration - elapsed)
    );

    return () => window.clearTimeout(timeout);
  }, [showLoginSplash, user, checkingDay]);

  // Sincronizacion inicial y periodica con control de concurrencia.
  useEffect(() => {
    if (!user || !dayStarted) return;

    const settings = JSON.parse(localStorage.getItem('esmark_settings') || '{}');
    if (!settings.trello_enabled || !settings.trello_board_id) {
      console.log("Trello no configurado - sincronizacion omitida");
      return;
    }

    // Sincronizacion con lock.
    const syncWithLock = async () => {
      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;
      try {
        const result = await syncTrelloToSupabase();
        
        if (result.success && result.imported > 0) {
          // Emitir evento de sincronizacion exitosa.
          window.dispatchEvent(new CustomEvent('trello-sync-success', { 
            detail: { imported: result.imported, skipped: result.skipped } 
          }));
          
          if (isNotificationEnabled('trello_sync')) {
            toast.success('Pedidos sincronizados', {
              description: `${result.imported} pedido(s) cargado(s) desde Trello`,
              duration: 4000,
            });
          }

          // Registrar en historial.
          logTrelloSync(result.imported, result.skipped).catch((err) => {
            console.log("Info: No se pudo registrar la sincronizacion en historial:", err);
          });
        } else if (result.skipped > 0) {
          console.log(`Sincronizacion: ${result.skipped} pedidos ya sincronizados`);
        }
      } catch (error: any) {
        console.error("Error en sincronizacion:", error.message);
      } finally {
        isSyncingRef.current = false;
      }
    };

    syncWithLock();

    const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos
    const syncInterval = setInterval(syncWithLock, SYNC_INTERVAL);

    return () => {
      clearInterval(syncInterval);
      isSyncingRef.current = false;
    };
  }, [user, dayStarted]);

  // Inicializacion del sistema.
  useEffect(() => {
    // Sincronizar settings al servidor
    import('./utils/sync-settings').then(({ syncSettingsToServer }) => {
      syncSettingsToServer().catch(() => {});
    });
    
    setHydrating(false);
  }, []);

  // Cerrar la verificacion inicial para evitar bloqueo en pantalla de carga.
  useEffect(() => {
    setNeedsSetup(false);
    setCheckingConfig(false);
  }, []);

  // Mantiene compatibilidad con SetupWizard.
  const handleSetupComplete = async () => {
    setNeedsSetup(false);
    setCheckingConfig(false);
    toast.success('Configuracion guardada', {
      description: 'La aplicacion se reiniciara para aplicar los cambios',
      duration: 3000,
    });

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleLogin = async (username: string, password: string) => {
    loginSplashStartedAtRef.current = Date.now();
    setShowLoginSplash(true);

    try {
      const { user: userData } = await authLogin(username, password);
      setDayStarted(false);
      setCheckingDay(true);

      const settings = safeParse(localStorage.getItem('esmark_settings'), {});
      const trelloConfigured = !!(settings.trello_enabled && settings.trello_board_id);

      if (trelloConfigured) {
        const showTrelloNotifications = isNotificationEnabled('trello_sync');
        if (showTrelloNotifications) {
          toast.loading('Sincronizando con Trello...', { id: 'trello-sync', duration: 10000 });
        }
        syncTrelloToSupabase()
          .then((result) => {
            if (result.success) {
              if (showTrelloNotifications) {
                toast.success('Sincronizacion completada', {
                  id: 'trello-sync',
                  description: `${result.imported} pedidos importados, ${result.skipped} omitidos`,
                  duration: 5000,
                });
              }
              logTrelloSync(result.imported, result.skipped).catch(() => {});
            } else if (showTrelloNotifications) {
              toast.dismiss('trello-sync');
            }
          })
          .catch(() => {
            if (showTrelloNotifications) {
              toast.dismiss('trello-sync');
            }
          });
      }

      setUser(userData);
      logUserLogin(userData.name).catch(() => {});
    } catch (err: unknown) {
      setShowLoginSplash(false);
      const message = err instanceof Error ? err.message : 'Error al iniciar sesion';
      alert(message);
    }
  };

  const handleLogout = () => {
    // Registrar cierre de sesion antes de desconectar.
    if (user) {
      logUserLogout(user.name).catch((err) => {
        console.log("Info: No se pudo registrar el cierre de sesion en historial:", err);
      });
    }

    // Detener sincronizacion y desconectar usuario.
    connectedUsersManager.disconnect();
    setUser(null);
    setDayStarted(false);
    setShowLoginSplash(false);
    setViewState({ view: "home" });

    authLogout();
  };

  // Limpiar al desmontar.
  useEffect(() => {
    return () => {
      connectedUsersManager.disconnect();
    };
  }, []);

  const normalizeView = (view: View | string): View => {
    if (view === "orders-menu") {
      return "orders-list";
    }
    if (view === "work-days-history") {
      return "close-day";
    }
    return view as View;
  };

  const navigateTo = (view: View | string, data?: any) => {
    if (view === "activity-log") {
      setViewState({ view: "settings", data: { tab: "activity-log" } });
      return;
    }
    setViewState({ view: normalizeView(view), data });
  };

  const renderView = () => {
    switch (viewState.view) {
      case "home":
        return <HomeView onNavigate={navigateTo} user={user ?? undefined} />;
      case "orders-menu":
        return <OrdersListView onNavigate={navigateTo} initialFilter={viewState.data?.filter} initialSearch={viewState.data?.search} />;
      case "order-form":
        return (
          <OrderFormView
            orderId={viewState.data?.orderId}
            fromQuote={viewState.data?.fromQuote}
            onBack={() => navigateTo("orders-list")}
            onNavigate={navigateTo}
          />
        );
      case "orders-list":
        return <OrdersListView onNavigate={navigateTo} initialFilter={viewState.data?.filter} initialSearch={viewState.data?.search} />;
      case "delivery":
        return <DeliveryView onNavigate={navigateTo} />;
      case "quote-form":
        return (
          <QuoteFormView
            quoteId={viewState.data?.quoteId}
            onBack={() => navigateTo("quotes-list")}
            onNavigate={navigateTo}
          />
        );
      case "quotes-list":
        return <QuotesListView onNavigate={navigateTo} />;
      case "inventory":
        return <InventoryView />;
      case "close-day":
        return (
          <CloseDayView
            onLogout={handleLogout}
            onNavigate={navigateTo}
            initialTab={viewState.data?.tab || (viewState.data?.fromHistory ? 'history' : 'start')}
          />
        );
      case "settings":
        return <SettingsView user={user} initialTab={viewState.data?.tab} />;
      case "petty-cash":
        return (
          <PettyCashView onBack={() => navigateTo("home")} />
        );
      case "price-calculator":
        return (
          <PriceCalculator onNavigate={navigateTo} />
        );
      case "templates":
        return <FacturaArea />;
      case "customers":
        return <CustomersView />;
      case "work-days-history":
        return (
          <CloseDayView
            onLogout={handleLogout}
            onNavigate={navigateTo}
            initialTab="history"
          />
        );
      case "day-report":
        return (
          <DayReportView 
            dayId={viewState.data?.dayId} 
            onBack={() => navigateTo("close-day", { tab: "history" })} 
          />
        );
      case "activity-log":
        return <SettingsView user={user} initialTab="activity-log" />;
      default:
        return <HomeView onNavigate={navigateTo} user={user ?? undefined} />;
    }
  };

  return (
    <DayProvider>
      {/* Verificando configuracion */}
      {checkingConfig && (
        <div className="flex items-center justify-center h-screen bg-linear-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-700 font-medium">Verificando configuracion...</p>
          </div>
        </div>
      )}

      {/* Setup Wizard */}
      {!checkingConfig && needsSetup && (
        <SetupWizard onComplete={handleSetupComplete} />
      )}

      {/* Hidratando sesion */}
      {!checkingConfig && !needsSetup && hydrating && (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <p className="text-sm text-gray-600">Restaurando sesion...</p>
        </div>
      )}

      {/* Login Screen */}
      {!checkingConfig && !needsSetup && !hydrating && showLoginSplash && (
        <LoginSplash message="Verificando tu sesión y jornada operativa..." />
      )}

      {!checkingConfig && !needsSetup && !hydrating && !showLoginSplash && !user && <LoginView onLogin={handleLogin} />}

      {/* Verificando dia operativo */}
      {!checkingConfig && !needsSetup && !hydrating && !showLoginSplash && user && checkingDay && (
        <LoginSplash message="Verificando tu jornada operativa..." />
      )}

      {/* Inicio de dia */}
      {!checkingConfig && !needsSetup && !hydrating && !showLoginSplash && user && !checkingDay && !dayStarted && (
        <DayStartView
          user={user}
          onComplete={() => setDayStarted(true)}
        />
      )}

      {/* Main Application */}
      {!checkingConfig && !needsSetup && !hydrating && !showLoginSplash && user && !checkingDay && dayStarted && (
      <div className="app-shell h-screen bg-slate-950 flex overflow-hidden relative">
        <Sidebar
          currentView={viewState.view}
          onNavigate={navigateTo}
          user={user}
          onLogout={handleLogout}
        />
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          <Header
            onNavigate={navigateTo}
            user={user}
            onLogout={handleLogout}
          />
          {/* Banner global de actualizaciones */}
          <UpdateBanner />
          <main className="main flex-1 overflow-y-auto">
            <div className="main-inner">
              {renderView()}
            </div>
          </main>
        </div>
      </div>
      )}
    </DayProvider>
  );
}

