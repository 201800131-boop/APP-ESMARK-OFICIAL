/**
 * Contexto global del dia operativo.
 *
 * Maneja el dia de trabajo actual con sincronizacion en tiempo real,
 * persistencia ligera y estado compartido entre pantallas.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentWorkDay, type WorkDay } from '../utils/work-days-api';

interface DayContextType {
  currentDay: WorkDay | null;
  isLoading: boolean;
  refreshDay: () => Promise<void>;
  setCurrentDay: (day: WorkDay | null) => void;
}

const DayContext = createContext<DayContextType | undefined>(undefined);

const STORAGE_KEY = 'esmark_current_day_id';
const POLL_INTERVAL = 5000;

interface DayProviderProps {
  children: ReactNode;
}

export function DayProvider({ children }: DayProviderProps) {
  const [currentDay, setCurrentDayState] = useState<WorkDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentDay = (day: WorkDay | null) => {
    setCurrentDayState(day);

    if (day) {
      localStorage.setItem(STORAGE_KEY, day.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const refreshDay = async () => {
    try {
      const day = await getCurrentWorkDay();
      setCurrentDay(day || null);
    } catch (error) {
      console.error('Error refreshing day:', error);
      setCurrentDay(null);
    }
  };

  useEffect(() => {
    const loadInitialDay = async () => {
      setIsLoading(true);
      try {
        const day = await getCurrentWorkDay();
        setCurrentDay(day || null);
      } catch (error) {
        console.error('Error loading initial day:', error);
        setCurrentDay(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialDay();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      refreshDay();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const serverDay = await getCurrentWorkDay();

        if (!serverDay && currentDay) {
          console.log('El dia de trabajo fue cerrado por otro usuario');
          setCurrentDay(null);
          return;
        }

        if (serverDay && (!currentDay || currentDay.id !== serverDay.id)) {
          console.log('Nuevo dia de trabajo detectado');
          setCurrentDay(serverDay);
          return;
        }

        if (serverDay && currentDay && serverDay.id !== currentDay.id) {
          console.log('Dia de trabajo actualizado');
          setCurrentDay(serverDay);
        }
      } catch {
        // El dia operativo es opcional; se evita ruido de consola durante polling.
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [currentDay]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        refreshDay();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <DayContext.Provider value={{ currentDay, isLoading, refreshDay, setCurrentDay }}>
      {children}
    </DayContext.Provider>
  );
}

export function useDay() {
  const context = useContext(DayContext);

  if (context === undefined) {
    throw new Error('useDay must be used within a DayProvider');
  }

  return context;
}
