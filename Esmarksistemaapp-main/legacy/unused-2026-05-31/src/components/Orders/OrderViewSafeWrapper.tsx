import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * Wrapper seguro para prevenir errores de memoria en visualizaciones
 */
interface OrderViewSafeWrapperProps {
  children: React.ReactNode;
  order: any;
}

export default function OrderViewSafeWrapper({ children, order }: OrderViewSafeWrapperProps) {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Reset error cuando cambia el pedido
    setHasError(false);
    setErrorMessage('');

    // Verificar si el pedido es muy grande
    if (order) {
      const attachmentCount = order.attachments?.length || 0;
      const itemsCount = order.items?.length || order.products?.length || 0;

      if (attachmentCount > 50) {
        setHasError(true);
        setErrorMessage(
          `Este pedido tiene ${attachmentCount} archivos adjuntos. Por favor, reduce la cantidad para evitar problemas de memoria.`
        );
      } else if (itemsCount > 100) {
        setHasError(true);
        setErrorMessage(
          `Este pedido tiene ${itemsCount} productos. Por favor, divide el pedido en partes más pequeñas.`
        );
      }
    }
  }, [order]);

  if (hasError) {
    return (
      <div className="p-6 space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>Documento demasiado grande</strong>
            <p className="mt-2">{errorMessage}</p>
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => {
            setHasError(false);
            setErrorMessage('');
          }}
          variant="outline"
        >
          Intentar mostrar de todas formas
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
