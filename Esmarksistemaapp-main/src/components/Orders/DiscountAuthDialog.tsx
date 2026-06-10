import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { verifyUserCredentials } from '../../utils/auth';

interface DiscountAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorized: (authUser: { username: string; name: string }) => void;
  onCancel?: () => void; // Nuevo callback para cancelación
  discountAmount: number;
  users: any[];
}

export default function DiscountAuthDialog({
  open,
  onOpenChange,
  onAuthorized,
  onCancel,
  discountAmount,
  users
}: DiscountAuthDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 [DiscountAuth] Validando autorización para descuento de L.', discountAmount);

      // Validar que el usuario exista
      const user = users.find((u: any) => 
        u.username.toLowerCase() === username.toLowerCase()
      );

      if (!user) {
        setError('Usuario no encontrado');
        toast.error('❌ Usuario no encontrado', {
          description: 'Verifica el nombre de usuario',
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      console.log('🔍 [DiscountAuth] Validando contraseña para usuario:', user.username);
      const authResult = await verifyUserCredentials(user.username, password);

      if (!authResult.ok) {
        setError('Contraseña incorrecta');
        toast.error('❌ Contraseña incorrecta', {
          description: 'La contraseña no coincide',
          duration: 3000,
        });
        setLoading(false);
        return;
      }

      const authorizedUser = authResult.user;

      // Validar que el usuario tenga permisos de autorización de descuentos
      if (!authorizedUser.can_authorize_discounts) {
        setError('Este usuario no tiene permisos para autorizar descuentos');
        toast.error('❌ Sin permisos', {
          description: 'Este usuario no puede autorizar descuentos. Contacta a un administrador.',
          duration: 4000,
        });
        setLoading(false);
        return;
      }

      // Autorización exitosa
      console.log('✅ [DiscountAuth] Autorización exitosa por:', authorizedUser.name);
      toast.success('✅ Autorización exitosa', {
        description: `Descuento autorizado por ${authorizedUser.name}`,
        duration: 3000,
      });

      onAuthorized({
        username: authorizedUser.username,
        name: authorizedUser.name
      });

      // Limpiar formulario y cerrar
      setUsername('');
      setPassword('');
      setError('');
      onOpenChange(false);
    } catch (err) {
      console.error('❌ [DiscountAuth] Error en autorización:', err);
      setError('Error al validar la autorización');
      toast.error('❌ Error', {
        description: 'Ocurrió un error al validar la autorización',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setUsername('');
    setPassword('');
    setError('');
    onOpenChange(false);
    
    // Llamar callback de cancelación si existe
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-md max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-500" />
            Autorización Requerida
          </DialogTitle>
          <DialogDescription className="text-sm">
            Ingresa las credenciales de un usuario autorizado para aplicar descuentos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAuth} className="space-y-4 mt-4">
          {/* Información del descuento */}
          {discountAmount > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Descuento a autorizar</p>
              <p className="text-2xl font-semibold text-gray-900">
                L. {discountAmount.toFixed(2)}
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Usuario */}
          <div className="space-y-2">
            <Label htmlFor="auth-username" className="text-sm font-medium">
              Usuario Autorizado
            </Label>
            <Input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nombre.usuario"
              required
              autoComplete="off"
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="auth-password" className="text-sm font-medium">
              Contraseña
            </Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="off"
            />
          </div>

          <p className="text-xs text-gray-500">
            Esta acción quedará registrada en el historial del sistema
          </p>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !username || !password}
              variant="primary"
            >
              {loading ? (
                <>Validando...</>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Autorizar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
