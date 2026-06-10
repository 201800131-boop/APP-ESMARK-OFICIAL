import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { ShieldCheck, Lock, AlertTriangle, Star, User } from 'lucide-react';
import { toast } from 'sonner';
import { verifyUserCredentials } from '../../utils/auth';

interface SpecialOrderAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorized: (authUser: { username: string; name: string }) => void;
  onCancel?: () => void;
  users: any[];
}

export default function SpecialOrderAuthDialog({
  open,
  onOpenChange,
  onAuthorized,
  onCancel,
  users
}: SpecialOrderAuthDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 [SpecialOrderAuth] Validando autorización para Pedido Especial');

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

      console.log('🔍 [SpecialOrderAuth] Validando contraseña para usuario:', user.username);
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
      // (Los pedidos especiales requieren los mismos permisos que los descuentos)
      if (!authorizedUser.can_authorize_discounts) {
        setError('Este usuario no tiene permisos para crear pedidos especiales');
        toast.error('❌ Sin permisos', {
          description: 'Este usuario no puede crear pedidos especiales. Contacta a un administrador.',
          duration: 4000,
        });
        setLoading(false);
        return;
      }

      // Autorización exitosa
      console.log('✅ [SpecialOrderAuth] Autorización exitosa por:', authorizedUser.name);
      toast.success('✅ Autorización exitosa', {
        description: `Pedido especial autorizado por ${authorizedUser.name}`,
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
      console.error('❌ [SpecialOrderAuth] Error en autorización:', err);
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
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-lg max-h-[88vh] overflow-y-auto p-0 border-0 shadow-2xl">
        {/* Header con degradado */}
        <div className="bg-linear-to-br from-purple-600 via-pink-600 to-purple-700 px-8 py-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl text-white">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <Star className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  🔐 Pedido Especial
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="text-purple-100 mt-2 text-base">
              Se requiere <strong className="text-white">autorización de usuario con permisos especiales</strong> para crear pedidos con descuentos
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Contenido del formulario */}
        <div className="px-8 py-6">
          <form onSubmit={handleAuth} className="space-y-6">
            {/* Alerta informativa */}
            <div className="bg-linear-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-purple-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-purple-900">
                    <strong className="block mb-1">Autorización Previa Requerida</strong>
                    <span className="text-purple-700">
                      Solo usuarios autorizados pueden crear pedidos especiales con descuentos personalizados.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <Alert className="bg-red-50 border-2 border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Campo Usuario */}
            <div className="space-y-3">
              <Label htmlFor="special-auth-username" className="text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-purple-600" />
                Usuario Autorizado
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <Input
                  id="special-auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  required
                  autoComplete="off"
                  className="pl-12 h-12 border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl transition-all"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-3">
              <Label htmlFor="special-auth-password" className="text-gray-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-600" />
                Contraseña
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <Input
                  id="special-auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  required
                  autoComplete="off"
                  className="pl-12 h-12 border-2 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl transition-all"
                />
              </div>
            </div>

            {/* Nota de seguridad */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-700" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-900">
                    <strong className="block mb-1">🔒 Seguridad y Trazabilidad</strong>
                    <span className="text-blue-700">
                      Esta autorización quedará registrada en el historial del sistema con tu nombre de usuario y marca de tiempo.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="px-6 h-11 rounded-xl border-2 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !username || !password}
                className="px-8 h-11 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Validando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    Autorizar Acceso
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
