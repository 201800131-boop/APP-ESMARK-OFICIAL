import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { UserPlus, Edit, Trash2, User, ShieldCheck } from 'lucide-react';
import { connectedUsersManager, ConnectedUser } from '../../utils/connected-users';
import { api } from '../../utils/api';
import { getCurrentUser } from '../../utils/auth';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { safeParse } from '../../utils/safe-parse';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operator';
  created_at: string;
  photo?: string; // URL o base64 de la foto
  can_authorize_discounts?: boolean; // Nuevo campo para permisos de descuentos
  password?: string; // Agregar password para validación
}

interface UsersTabProps {
  currentUser?: any;
}

export default function UsersTab({ currentUser }: UsersTabProps = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const sessionUser = currentUser?.role ? currentUser : getCurrentUser();
  const isAdmin = String(sessionUser?.role || '').toLowerCase() === 'admin' || String(sessionUser?.username || '').toLowerCase() === 'admin';

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'operator' as 'admin' | 'operator',
    photo: '',
    can_authorize_discounts: false,
  });
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoTemp, setPhotoTemp] = useState<string>('');
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      void loadUsers();
    }
    loadConnectedUsers();

    // Actualizar usuarios conectados cada 2 segundos
    const interval = setInterval(() => {
      loadConnectedUsers();
    }, 2000);

    // Escuchar cambios en usuarios conectados
    const handleUsersChange = () => {
      loadConnectedUsers();
    };
    window.addEventListener('connectedUsersChanged', handleUsersChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('connectedUsersChanged', handleUsersChange);
    };
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const collectedUsers: User[] = [];
      const addUsers = (list: any[]) => {
        list
          .filter((candidate) => candidate && (candidate.id || candidate.username))
          .forEach((candidate) => {
            const normalized = {
              ...candidate,
              id: String(candidate.id || candidate.username),
              username: candidate.username || candidate.id,
              name: candidate.name || candidate.username || 'Usuario',
              role: candidate.role === 'admin' ? 'admin' : 'operator',
              created_at: candidate.created_at || new Date().toISOString(),
            } as User;
            const existingIndex = collectedUsers.findIndex(
              (user) => user.id === normalized.id || user.username === normalized.username
            );
            if (existingIndex >= 0) {
              collectedUsers[existingIndex] = { ...collectedUsers[existingIndex], ...normalized };
            } else {
              collectedUsers.push(normalized);
            }
          });
      };

      try {
        const result = await api.getUsers();
        const remoteUsers = Array.isArray(result?.users) ? result.users : [];
        addUsers(remoteUsers);
      } catch (apiError) {
        console.warn('No se pudo cargar usuarios desde api.getUsers:', apiError);
      }

      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/users`, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            apikey: publicAnonKey,
          },
        });

        if (response.ok) {
          const data = await response.json();
          addUsers(Array.isArray(data?.users) ? data.users : []);
        } else {
          console.warn(`Supabase usuarios respondio HTTP ${response.status}`);
        }
      } catch (directError) {
        console.warn('No se pudo cargar usuarios directo desde Supabase:', directError);
      }

      const localUsers = safeParse(localStorage.getItem('esmark_users'), []);
      if (Array.isArray(localUsers)) {
        addUsers(localUsers);
      }

      const currentUserId = sessionUser?.id;
      if (currentUserId) {
        try {
          const syncResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/download?userId=${encodeURIComponent(currentUserId)}`, {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              apikey: publicAnonKey,
            },
          });
          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            const syncedUsers = syncData?.appData?.esmark_users || syncData?.esmark_users || syncData?.users;
            if (Array.isArray(syncedUsers)) {
              addUsers(syncedUsers);
            }
          }
        } catch (syncError) {
          console.warn('No se pudo leer usuarios desde sincronizacion:', syncError);
        }
      }

      setUsers(collectedUsers);
    } catch (err: any) {
      const localUsers = safeParse(localStorage.getItem('esmark_users'), []);
      if (Array.isArray(localUsers) && localUsers.length > 0) {
        setUsers(localUsers);
        setError('Usuarios cargados desde datos locales. Revisa conexion con Supabase.');
      } else {
        setError(err.message || 'Error al cargar usuarios');
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadConnectedUsers = () => {
    // Cargar usuarios conectados
    const currentUsers = connectedUsersManager.getConnectedUsers();
    setConnectedUsers(currentUsers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username || !formData.name) {
      setError('Usuario y nombre son requeridos');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('La contraseña es requerida para nuevos usuarios');
      return;
    }

    setLoading(true);

    try {
      if (editingUser) {
        const result = await api.updateUser(editingUser.id, {
          username: formData.username,
          name: formData.name,
          role: formData.role,
          photo: formData.photo,
          can_authorize_discounts: formData.can_authorize_discounts,
          ...(formData.password ? { password: formData.password } : {})
        });
        setUsers(prev => prev.map(u => u.id === editingUser.id ? result.user : u));
        setSuccess('Usuario actualizado correctamente');
      } else {
        const result = await api.createUser({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          photo: formData.photo,
          can_authorize_discounts: formData.can_authorize_discounts,
        });
        setUsers(prev => [...prev, result.user]);
        setSuccess('Usuario creado correctamente');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError('');
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('La imagen debe ser menor a 10MB');
        return;
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten archivos de imagen');
        return;
      }

      // Crear preview con FileReader para Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoTemp(reader.result as string);
        setPhotoZoom(1);
        setPhotoOffset({ x: 0, y: 0 });
        setPhotoEditorOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      role: user.role,
      photo: user.photo || '',
      can_authorize_discounts: user.can_authorize_discounts || false,
    });
    setIsDialogOpen(true);
  };

  const applyCroppedPhoto = () => {
    if (!photoTemp) {
      setPhotoEditorOpen(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const baseScale = Math.max(size / img.width, size / img.height);
      const scale = baseScale * photoZoom;
      const targetW = img.width * scale;
      const targetH = img.height * scale;
      const previewToCanvas = size / 320;
      const dx = (size - targetW) / 2 + photoOffset.x * previewToCanvas;
      const dy = (size - targetH) / 2 + photoOffset.y * previewToCanvas;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, dx, dy, targetW, targetH);
      ctx.restore();

      const output = canvas.toDataURL('image/png');
      setFormData((prev) => ({ ...prev, photo: output }));
      setPhotoEditorOpen(false);
      setPhotoTemp('');
    };
    img.src = photoTemp;
  };

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setPhotoOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleDragEnd = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragStart(null);
  };

  const handleDelete = async (userId: string) => {
    setError('');
    setSuccess('');
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      const userToDelete = users.find((user) => user.id === userId || user.username === userId);
      await api.deleteUser(userId, userToDelete);

      if (userToDelete) {
        const localUsers = safeParse(localStorage.getItem('esmark_users'), []);
        if (Array.isArray(localUsers)) {
          const nextLocalUsers = localUsers.filter((candidate: any) => {
            const candidateId = String(candidate?.id || '');
            const candidateLegacyId = String(candidate?.legacy_id || candidate?.legacyId || '');
            const candidateUsername = String(candidate?.username || '');
            return ![candidateId, candidateLegacyId, candidateUsername].includes(userToDelete.id)
              && candidateUsername !== userToDelete.username;
          });
          localStorage.setItem('esmark_users', JSON.stringify(nextLocalUsers));
        }
      }

      setUsers(prev => prev.filter(u => u.id !== userId && u.username !== userToDelete?.username));
      setSuccess('Usuario eliminado correctamente de Supabase');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'operator',
      photo: '',
      can_authorize_discounts: false,
    });
    setEditingUser(null);
    setError('');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const isUserOnline = (userId: string): boolean => {
    const user = users.find((candidate) => candidate.id === userId || candidate.username === userId);
    return connectedUsers.some((connectedUser) =>
      connectedUser.id === userId ||
      connectedUser.name === userId ||
      (!!user && (
        connectedUser.id === user.username ||
        connectedUser.name === user.name ||
        connectedUser.id === user.id
      ))
    );
  };

  const getConnectedUserProfile = (connectedUser: ConnectedUser) => {
    return users.find((user) =>
      user.id === connectedUser.id ||
      user.username === connectedUser.id ||
      user.name === connectedUser.name
    );
  };

  if (!isAdmin) {
    return (
      <Card className="users-config-list-card">
        <CardContent className="pt-6">
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              Solo los administradores pueden gestionar usuarios
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <div className="settings-panel-clean users-config-panel space-y-6">
      <div className="users-config-head flex items-center justify-between">
        <div>
          <h2 className="text-foreground font-bold">Gestión de Usuarios</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button variant="primary" className="users-config-primary-btn">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="users-config-dialog !w-[min(96vw,900px)] !max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="border-b bg-slate-950 px-6 py-5 text-white">
              <DialogTitle className="text-xl font-black text-white">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                {editingUser
                  ? 'Modifica la información del usuario'
                  : 'Completa los datos del nuevo usuario del sistema'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="users-config-form space-y-5 p-6">
              {error && (
                <Alert className="users-config-error-alert bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="nombre.usuario"
                  required
                  disabled={!!editingUser}
                  className="users-config-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required={!editingUser}
                  className="users-config-input"
                />
              </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                  className="users-config-input"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Label htmlFor="photo">Foto de Perfil</Label>
                <div className="mt-4 grid gap-4 sm:grid-cols-[132px_1fr] sm:items-center">
                  <div className="mx-auto w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg ring-1 ring-slate-200">
                    {formData.photo ? (
                      <img
                        src={formData.photo}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="users-config-input cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximo 10MB. Formatos: JPG, PNG, GIF. Al seleccionar una imagen podras encajar y escalar antes de guardarla.
                    </p>
                    {formData.photo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, photo: '' })}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Eliminar foto
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'operator') =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger className="users-config-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Los administradores tienen acceso completo al sistema
                </p>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="can_authorize_discounts" className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      Autorización de Descuentos
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Permite a este usuario autorizar descuentos especiales en pedidos
                    </p>
                  </div>
                  <Switch
                    id="can_authorize_discounts"
                    checked={formData.can_authorize_discounts}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, can_authorize_discounts: checked })
                    }
                  />
                </div>
                {formData.can_authorize_discounts && (
                  <Alert className="bg-amber-50 border-amber-300 mt-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-xs">
                      Este usuario podrá autorizar descuentos. Todas las autorizaciones quedarán registradas en el historial del sistema.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  className="users-config-secondary-btn flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  variant="primary"
                  className="users-config-primary-btn flex-1"
                >
                  {loading ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="users-config-success-alert bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Card className="users-config-list-card">
        <CardHeader className="users-config-list-head">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuarios del Sistema</CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? 'usuario registrado' : 'usuarios registrados'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="users-config-secondary-btn"
                onClick={() => void loadUsers()}
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Refrescar'}
              </Button>
              <Badge variant="success" className="text-xs bg-green-100 text-green-700 border-green-300">
                {connectedUsers.length} online
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {connectedUsers.length >= 2 && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-emerald-900">Usuarios en linea ahora</p>
                  <p className="text-xs text-emerald-700">{connectedUsers.length} usuarios trabajando en el sistema</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {connectedUsers.slice(0, 6).map((connectedUser) => {
                      const profile = getConnectedUserProfile(connectedUser);
                      return (
                        <div
                          key={connectedUser.id}
                          title={profile?.name || connectedUser.name}
                          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-emerald-600 text-xs font-black text-white shadow-sm"
                        >
                          {profile?.photo ? (
                            <img src={profile.photo} alt={profile.name} className="h-full w-full object-cover" />
                          ) : (
                            getInitials(profile?.name || connectedUser.name)
                          )}
                        </div>
                      );
                    })}
                    {connectedUsers.length > 6 && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-xs font-black text-white shadow-sm">
                        +{connectedUsers.length - 6}
                      </div>
                    )}
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-bold text-emerald-800">
                      {connectedUsers.slice(0, 3).map((u) => getConnectedUserProfile(u)?.name || u.name).join(', ')}
                    </p>
                    <p className="text-[11px] text-emerald-700">Conectados</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert className="users-config-error-alert mb-4 bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="py-8 text-center text-sm text-gray-600">
              Cargando usuarios...
            </div>
          )}

          {!loading && users.length === 0 && !error && (
            <div className="users-config-empty py-8 text-center text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg">
              No hay usuarios registrados en Supabase.
            </div>
          )}

          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="users-config-user-row flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border-2 ${
                        user.role === 'admin' 
                          ? 'bg-red-100 border-red-200' 
                          : 'bg-blue-100 border-blue-200'
                      }`}
                    >
                      {user.photo ? (
                        <img 
                          src={user.photo} 
                          alt={user.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          user.role === 'admin' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          <span className="text-lg font-semibold">
                            {getInitials(user.name)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Indicador de usuario conectado */}
                    {isUserOnline(user.id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={
                          user.role === 'admin'
                            ? 'bg-red-100 text-red-700 hover:bg-red-100'
                            : ''
                        }
                      >
                        {user.role === 'admin' ? 'Administrador' : 'Operador'}
                      </Badge>
                      {user.can_authorize_discounts && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Autoriza Descuentos
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">@{user.username}</p>
                    <p className="text-xs text-gray-400">
                      Creado: {new Date(user.created_at).toLocaleDateString('es-HN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(user)}
                    className="users-config-icon-btn"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
                    className="users-config-icon-btn text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={user.username === 'admin'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    {/* Editor de foto de usuario */}
    <Dialog open={photoEditorOpen} onOpenChange={setPhotoEditorOpen}>
      <DialogContent className="users-config-dialog !w-[min(94vw,760px)] !max-w-[760px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="border-b bg-slate-950 px-6 py-5 text-white">
          <DialogTitle className="text-white">Ajustar foto de perfil</DialogTitle>
          <DialogDescription className="text-slate-300">Arrastra la imagen, ajusta el zoom y encajala dentro del circulo.</DialogDescription>
        </DialogHeader>
        {photoTemp && (
          <div className="grid gap-6 p-6 md:grid-cols-[360px_1fr]">
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative h-80 w-80 cursor-move touch-none select-none overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-xl ring-1 ring-slate-300"
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
              >
                <img
                  src={photoTemp}
                  alt="Editar"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    transform: `translate(${photoOffset.x}px, ${photoOffset.y}px) scale(${photoZoom})`,
                    transformOrigin: 'center center',
                  }}
                  draggable={false}
                />
                <div className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-blue-500/60" />
              </div>
              <p className="text-center text-xs text-slate-500">Arrastra sobre la foto para moverla.</p>
            </div>

            <div className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Escala</Label>
                    <span className="text-xs font-bold text-slate-500">{Math.round(photoZoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={photoZoom}
                    onChange={(e) => setPhotoZoom(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Movimiento horizontal</Label>
                  <input
                    type="range"
                    min={-150}
                    max={150}
                    step={2}
                    value={photoOffset.x}
                    onChange={(e) => setPhotoOffset({ ...photoOffset, x: parseInt(e.target.value) || 0 })}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Movimiento vertical</Label>
                  <input
                    type="range"
                    min={-150}
                    max={150}
                    step={2}
                    value={photoOffset.y}
                    onChange={(e) => setPhotoOffset({ ...photoOffset, y: parseInt(e.target.value) || 0 })}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="users-config-secondary-btn w-full"
                  onClick={() => {
                    setPhotoZoom(1);
                    setPhotoOffset({ x: 0, y: 0 });
                  }}
                >
                  Reiniciar ajuste
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="users-config-secondary-btn" onClick={() => setPhotoEditorOpen(false)}>Cancelar</Button>
                  <Button className="users-config-primary-btn" onClick={applyCroppedPhoto}>Usar foto</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
