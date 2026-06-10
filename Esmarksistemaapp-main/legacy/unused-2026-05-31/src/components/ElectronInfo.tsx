import React, { useEffect, useState } from 'react';
import { isElectron, getAppVersion, getPlatform } from '../utils/electron-helper';
import { Badge } from './ui/badge';
import { Monitor, Globe } from 'lucide-react';

/**
 * Componente de ejemplo que muestra información de Electron
 * Puedes usarlo en cualquier parte de la app para mostrar info del sistema
 */
export function ElectronInfo() {
  const [version, setVersion] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const inElectron = isElectron();

  useEffect(() => {
    const loadInfo = async () => {
      const v = await getAppVersion();
      const p = getPlatform();
      setVersion(v);
      setPlatform(p);
    };

    loadInfo();
  }, []);

  if (!inElectron) return null; // No mostrar en web

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1.5">
        {inElectron ? (
          <>
            <Monitor className="w-3 h-3" />
            <span>Desktop v{version}</span>
          </>
        ) : (
          <>
            <Globe className="w-3 h-3" />
            <span>Web</span>
          </>
        )}
      </Badge>
      {platform && platform !== 'web' && (
        <Badge variant="secondary" className="text-xs">
          {platform}
        </Badge>
      )}
    </div>
  );
}

export default ElectronInfo;
