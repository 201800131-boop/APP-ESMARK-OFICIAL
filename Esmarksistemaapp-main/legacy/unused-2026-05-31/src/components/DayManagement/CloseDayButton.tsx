/**
 * 🌙 CLOSE DAY BUTTON
 * 
 * Botón para cerrar el día de trabajo actual
 * Incluye confirmación y generación de reporte
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Moon } from 'lucide-react';
import CloseDayDialog from './CloseDayDialog';
import { useDay } from '../../contexts/DayContext';

interface CloseDayButtonProps {
  userId: string;
  userName: string;
}

export default function CloseDayButton({ userId, userName }: CloseDayButtonProps) {
  const { currentDay } = useDay();
  const [showDialog, setShowDialog] = useState(false);

  // No mostrar botón si no hay día abierto
  if (!currentDay) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="w-full bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
      >
        <Moon className="w-4 h-4 mr-2" />
        Cerrar Día
      </Button>

      <CloseDayDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        userId={userId}
        userName={userName}
      />
    </>
  );
}
