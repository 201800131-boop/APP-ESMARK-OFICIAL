import React, { useEffect, useState } from 'react';

interface UpdateState {
  status?: 'CHECKING' | 'UPDATE_AVAILABLE' | 'NOT_AVAILABLE' | 'DOWNLOADING' | 'DOWNLOADED' | 'ERROR';
  version?: string;
  progress?: { percent?: number; transferred?: number; total?: number };
  message?: string;
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateState>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.esmarkUpdates) return;
    const unsubscribe = window.esmarkUpdates.onStatus((payload) => {
      setUpdate(payload);
      if (payload.status === 'UPDATE_AVAILABLE') {
        setVisible(true);
      }
      if (payload.status === 'DOWNLOADED') {
        setVisible(true);
      }
      if (payload.status === 'ERROR') {
        setVisible(true);
      }
    });
    return () => {
      try { unsubscribe && unsubscribe(); } catch {}
    };
  }, []);

  if (!visible) return null;

  const renderContent = () => {
    if (update.status === 'UPDATE_AVAILABLE') {
      return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <span className="text-lg">\uD83D\uDD04</span>
            <div>
              <p className="text-base font-bold">ACTUALIZACIÓN DISPONIBLE</p>
              {update.version && (
                <p className="text-sm opacity-80">Versión nueva: {update.version}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => window.esmarkUpdates?.check()}
            >
              Ver progreso
            </button>
          </div>
        </div>
      );
    }
    if (update.status === 'DOWNLOADING') {
      const pct = Math.floor(update.progress?.percent || 0);
      return (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="text-lg">\u23F3</span>
            <p className="text-sm">Descargando actualización... {pct}%</p>
          </div>
          <div className="w-40 h-2 bg-white/30 rounded">
            <div className="h-2 bg-white rounded" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    }
    if (update.status === 'DOWNLOADED') {
      return (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="text-lg">\u2705</span>
            <p className="text-base font-semibold">Listo para actualizar. Reiniciar</p>
          </div>
          <button
            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
            onClick={() => window.esmarkUpdates?.install()}
          >
            Reiniciar y actualizar
          </button>
        </div>
      );
    }
    if (update.status === 'ERROR') {
      return (
        <div className="flex items-center justify-between w-full">
          <p className="text-sm">Error en actualizaciones: {update.message || 'Desconocido'}</p>
          <button
            className="px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30"
            onClick={() => setVisible(false)}
          >
            Ocultar
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-2 mt-2 rounded-lg border-2 border-indigo-300 bg-indigo-600/90 text-white shadow-lg p-3">
        {renderContent()}
      </div>
    </div>
  );
}
