import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Settings, FileText, Save, Plus, AlertTriangle, Calendar as CalendarIcon, Check, DollarSign, Users, Package, Layers, Bell, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PriceConfigTab from './PriceConfigTab';
import UsersTab from './UsersTab';
import ProductCatalogTab from './ProductCatalogTab';
import { TrelloAutoConfigTab } from './TrelloAutoConfigTab';
import CorrelativeStatus from '../Documents/CorrelativeStatus';
import ActivityLogView from '../ActivityLog/ActivityLogView';
import type { ProductPackage, PackageRow } from '../../types/product-package';
import { safeParse } from '../../utils/safe-parse';
import { DEFAULT_NOTIFICATION_SETTINGS, notifyNotificationSettingsChanged } from '../../utils/notification-settings';
import { toast } from 'sonner';

const PACKAGES_STORAGE_KEY = 'esmark_product_packages';

interface SettingsViewProps {
  user?: any;
  initialTab?: string;
}

export default function SettingsView({ user, initialTab = 'prices' }: SettingsViewProps = {}) {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<any>({});

  // Settings form
  const [companyName, setCompanyName] = useState('');
  const [companyRtn, setCompanyRtn] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [isvPercent, setIsvPercent] = useState(15);

  // Fiscal series form
  const [productPackages, setProductPackages] = useState<ProductPackage[]>([]);
  const [showAddPackageDialog, setShowAddPackageDialog] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageType, setNewPackageType] = useState('');
  const [newPackageDescription, setNewPackageDescription] = useState('');
  const [newPackageActive, setNewPackageActive] = useState(true);
  const [newPackageSizeHeaders, setNewPackageSizeHeaders] = useState<string[]>([]);
  const [sizeHeaderInput, setSizeHeaderInput] = useState('');
  const [newPackageRows, setNewPackageRows] = useState<PackageRow[]>([]);
  const [newRowDraft, setNewRowDraft] = useState({
    quantityLabel: '',
    quantity: 0,
    prices: {} as Record<string, string>,
  });
  const [shapeSelection, setShapeSelection] = useState<{ [shape: string]: boolean }>({
    Redondo: true,
    Cuadrado: true,
    Silueta: false,
  });
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);

  const persistPackagesToLocalStorage = (value: ProductPackage[]) => {
    try {
      localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn('No se pudo persistir paquetes en localStorage:', error);
    }
  };

  const loadPackagesFromLocalStorage = (): ProductPackage[] => {
    try {
      const raw = localStorage.getItem(PACKAGES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Error leyendo paquetes guardados localmente:', error);
      return [];
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const localPackages = loadPackagesFromLocalStorage();
    if (localPackages.length > 0) {
      setProductPackages(localPackages);
    }
  }, []);

  const normalizeNotificationSettings = (value: any) => {
    if (!value || typeof value !== 'object') {
      return { ...DEFAULT_NOTIFICATION_SETTINGS };
    }
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...value };
  };

  const saveSettingsPartial = async (partialSettings: Record<string, any>, successMessage?: string) => {
    const currentSettings = {
      ...safeParse(localStorage.getItem('esmark_settings'), {}),
      ...settings,
    };
    const updatedSettings = { ...currentSettings, ...partialSettings };
    await api.updateSettings(updatedSettings);
    setSettings(updatedSettings);
    localStorage.setItem('esmark_settings', JSON.stringify(updatedSettings));
    if (partialSettings.product_packages) {
      persistPackagesToLocalStorage(partialSettings.product_packages);
    }
    if (successMessage) {
      setSuccess(successMessage);
    }
  };

  const handleNotificationToggle = async (key: keyof typeof DEFAULT_NOTIFICATION_SETTINGS, checked: boolean) => {
    const updated = { ...notificationSettings, [key]: !!checked };
    const currentSettings = {
      ...safeParse(localStorage.getItem('esmark_settings'), {}),
      ...settings,
      notification_settings: updated,
    };

    setNotificationSettings(updated);
    setSettings(currentSettings);
    localStorage.setItem('esmark_settings', JSON.stringify(currentSettings));
    notifyNotificationSettingsChanged(updated);

    try {
      await api.updateSettings(currentSettings);
    } catch (err: any) {
      setError(err.message || 'Error al guardar notificaciones');
      toast.error('No se pudieron guardar las notificaciones');
    }
  };

  const handleSaveNotifications = async () => {
    setError('');
    setSuccess('');
    try {
      await saveSettingsPartial(
        { notification_settings: notificationSettings },
        'Notificaciones guardadas correctamente'
      );
      toast.success('Notificaciones actualizadas');
    } catch (err: any) {
      setError(err.message || 'Error al guardar notificaciones');
      toast.error('No se pudieron guardar las notificaciones');
    }
  };

  const loadData = async () => {
    try {
      // SUPABASE ES LA UNICA FUENTE DE VERDAD para configuraciones
      console.log(' Cargando configuraciones desde Supabase...');
      
      const [{ settings: supabaseSettings }, packagesData] = await Promise.all([
        api.getSettings(),
        api.getProductPackages(),
      ]);
      
      if (supabaseSettings) {
        console.log(' Configuraciones cargadas desde Supabase');
        setSettings(supabaseSettings);
        setCompanyName(supabaseSettings.company_name || 'ESMARK');
        setCompanyRtn(supabaseSettings.company_rtn || '');
        setCompanyAddress(supabaseSettings.company_address || '');
        setCompanyPhone(supabaseSettings.company_phone || '');
        setCompanyEmail(supabaseSettings.company_email || '');
        setCompanyWebsite(supabaseSettings.company_website || '');
        setIsvPercent(supabaseSettings.isv_percent || 15);
        setNotificationSettings(normalizeNotificationSettings(supabaseSettings.notification_settings));
        const remotePackages = Array.isArray(packagesData.packages) ? packagesData.packages : [];
        const packages = remotePackages.length > 0
          ? remotePackages
          : Array.isArray(supabaseSettings.product_packages) ? supabaseSettings.product_packages : [];
        setProductPackages(packages);
        persistPackagesToLocalStorage(packages);
        localStorage.setItem('esmark_settings', JSON.stringify(supabaseSettings));
      } else {
        console.log(' No hay configuraciones en Supabase - usando valores por defecto');
        const defaultSettings = {
          company_name: 'ESMARK',
          company_rtn: '',
          company_address: '',
          company_phone: '',
          company_email: '',
          company_website: '',
          isv_percent: 15,
          product_packages: [],
          notification_settings: { ...DEFAULT_NOTIFICATION_SETTINGS },
        };
        setSettings(defaultSettings);
        setCompanyName('ESMARK');
        setCompanyRtn('');
        setCompanyAddress('');
        setCompanyPhone('');
        setCompanyEmail('');
        setCompanyWebsite('');
        setIsvPercent(15);
        setProductPackages([]);
        setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS });
        persistPackagesToLocalStorage([]);
        localStorage.setItem('esmark_settings', JSON.stringify(defaultSettings));
      }

    } catch (error) {
      console.error(' Error cargando configuraciones desde Supabase:', error);
      // En caso de error, usar valores por defecto
      setSettings({ company_name: 'ESMARK', isv_percent: 15 });
      setCompanyName('ESMARK');
      setCompanyRtn('');
      setCompanyAddress('');
      setCompanyPhone('');
      setCompanyEmail('');
      setCompanyWebsite('');
      setIsvPercent(15);
      setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS });
      const localPackages = loadStoredProductPackages();
      setProductPackages(localPackages);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const settingsData = {
        company_name: companyName,
        company_rtn: companyRtn,
        company_address: companyAddress,
        company_phone: companyPhone,
        company_email: companyEmail,
        company_website: companyWebsite,
        isv_percent: isvPercent,
        product_packages: productPackages,
        notification_settings: notificationSettings,
      };
      
      // SUPABASE ES LA UNICA FUENTE DE VERDAD - guardar directamente
      console.log('Guardando configuraciones en Supabase...');
      await api.updateSettings({
        ...safeParse(localStorage.getItem('esmark_settings'), {}),
        ...settingsData,
      });
      await api.saveProductPackages(productPackages);
      
      console.log(' Configuraciones guardadas exitosamente en Supabase');
      setSuccess(' Configuracion guardada correctamente');
      
      // Actualizar estado local
      setSettings(settingsData);
      persistPackagesToLocalStorage(productPackages);
      localStorage.setItem('esmark_settings', JSON.stringify(settingsData));
    } catch (error: any) {
      console.error(' Error guardando configuracion en Supabase:', error);
      setError(error.message || 'Error al guardar configuracion');
    }
  };

  const addSizeHeader = () => {
    const label = sizeHeaderInput.trim();
    if (!label) {
      toast.error('Agrega una cabecera de tamano valida');
      return;
    }
    if (newPackageSizeHeaders.includes(label)) {
      toast.warning('Ese tamano ya fue agregado');
      return;
    }
    setNewPackageSizeHeaders([...newPackageSizeHeaders, label]);
    setSizeHeaderInput('');
  };

  const removeSizeHeader = (label: string) => {
    setNewPackageSizeHeaders((prev) => prev.filter((value) => value !== label));
    setNewPackageRows((prev) =>
      prev.map((row) => {
        const prices = { ...row.prices };
        delete prices[label];
        return { ...row, prices };
      })
    );
  };

  const updateRowPrice = (header: string, value: string) => {
    setNewRowDraft((prev) => ({
      ...prev,
      prices: {
        ...prev.prices,
        [header]: value,
      },
    }));
  };

  const addPackageRow = () => {
    if (!newRowDraft.quantityLabel.trim() || newRowDraft.quantity <= 0) {
      toast.error('Completa etiqueta y cantidad mayor a cero');
      return;
    }
    if (newPackageSizeHeaders.length === 0) {
      toast.error('Agrega primero los encabezados de tamano');
      return;
    }
    const prices: Record<string, number> = {};
    for (const header of newPackageSizeHeaders) {
      const raw = newRowDraft.prices[header] || '0';
      prices[header] = parseFloat(raw) || 0;
    }
    const newRow: PackageRow = {
      id: `row-${Date.now()}-${newPackageRows.length}`,
      quantityLabel: newRowDraft.quantityLabel,
      quantity: newRowDraft.quantity,
      prices,
    };
    setNewPackageRows([...newPackageRows, newRow]);
    setNewRowDraft({ quantityLabel: '', quantity: 0, prices: {} });
  };

  const resetPackageForm = () => {
    setNewPackageName('');
    setNewPackageType('');
    setNewPackageDescription('');
    setNewPackageActive(true);
    setNewPackageSizeHeaders([]);
    setSizeHeaderInput('');
    setNewPackageRows([]);
    setNewRowDraft({ quantityLabel: '', quantity: 0, prices: {} });
    setShapeSelection({ Redondo: true, Cuadrado: true, Silueta: false });
  };

  const handleAddPackage = async () => {
    if (!newPackageName.trim() || !newPackageType.trim()) {
      toast.error('Agrega nombre y tipo de paquete');
      return;
    }
    if (newPackageSizeHeaders.length === 0) {
      toast.error('Define al menos un tamano (cabecera)');
      return;
    }
    if (newPackageRows.length === 0) {
      toast.error('Agrega al menos una fila con precios');
      return;
    }
    const shapes = Object.entries(shapeSelection)
      .filter(([, enabled]) => enabled)
      .map(([shape]) => shape);
    if (shapes.length === 0) {
      toast.error('Selecciona al menos una forma (redondo, cuadrado o silueta)');
      return;
    }
    const pkg: ProductPackage = {
      id: `pkg-${Date.now()}`,
      name: newPackageName.trim(),
      productType: newPackageType.trim(),
      description: newPackageDescription.trim() || undefined,
      activo: newPackageActive,
      shapes,
      sizeHeaders: [...newPackageSizeHeaders],
      rows: [...newPackageRows],
    };
    const updated = [...productPackages, pkg];
    try {
      const saved = await api.saveProductPackages(updated);
      const nextPackages = Array.isArray(saved.packages) && saved.packages.length > 0 ? saved.packages : updated;
      setProductPackages(nextPackages);
      persistPackagesToLocalStorage(nextPackages);
      await saveSettingsPartial({ product_packages: nextPackages });
      toast.success('Paquete guardado');
      resetPackageForm();
    } catch (error: any) {
      setProductPackages(updated);
      persistPackagesToLocalStorage(updated);
      setError(error.message || 'Error al guardar paquete en Supabase');
      toast.error('No se pudo guardar el paquete en Supabase');
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    const updated = productPackages.filter((pkg) => pkg.id !== packageId);
    try {
      const saved = await api.saveProductPackages(updated);
      const nextPackages = Array.isArray(saved.packages) ? saved.packages : updated;
      setProductPackages(nextPackages);
      persistPackagesToLocalStorage(nextPackages);
      await saveSettingsPartial({ product_packages: nextPackages });
    } catch (error: any) {
      setError(error.message || 'Error al eliminar paquete en Supabase');
      toast.error('No se pudo eliminar el paquete');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-900">Cargando configuracion...</p>
      </div>
    );
  }

  return (
    <div className="app-page settings-page space-y-6">
      <div className="settings-hero">
        <div>
          <h1>Ajustes del Sistema</h1>
          <p>Configuracion operativa, usuarios, catalogo, precios e integraciones.</p>
        </div>
        <div className="settings-hero-status">
          <span>Supabase activo</span>
          <span>{user?.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
        </div>
      </div>

      {success && (
        <Alert className="bg-green-50 border-2 border-green-200">
          <Check className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={initialTab} className="settings-tabs-root space-y-6">
        <TabsList className="settings-tabs flex flex-wrap gap-1.5 w-full h-auto p-1.5">
          <TabsTrigger value="trello-auto" className="settings-tab">
            <Settings className="w-3.5 h-3.5" />
            <span>Trello</span>
          </TabsTrigger>
          <TabsTrigger value="prices" className="settings-tab">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Precios</span>
          </TabsTrigger>
          <TabsTrigger value="catalog" className="settings-tab">
            <Package className="w-3.5 h-3.5" />
            <span>Catalogo</span>
          </TabsTrigger>
          <TabsTrigger value="packages" className="settings-tab">
            <Layers className="w-3.5 h-3.5" />
            <span>Paquetes</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="settings-tab">
            <Users className="w-3.5 h-3.5" />
            <span>Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="settings-tab">
            <Bell className="w-3.5 h-3.5" />
            <span>Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="activity-log" className="settings-tab">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Historial</span>
          </TabsTrigger>
        </TabsList>

        {/* AUTO TRELLO - CONFIGURACIN AUTOMATICA */}
        <TabsContent value="trello-auto">
          <TrelloAutoConfigTab />
        </TabsContent>

        {/* General Settings */}
        {false && (
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuracion General</CardTitle>
              <CardDescription>Datos basicos de la empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyRtn">RTN</Label>
                    <Input
                      id="companyRtn"
                      value={companyRtn}
                      onChange={(e) => setCompanyRtn(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Telefono</Label>
                    <Input
                      id="companyPhone"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Correo</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Sitio Web</Label>
                    <Input
                      id="companyWebsite"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyAddress">Direccion</Label>
                  <Textarea
                    id="companyAddress"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isvPercent">Impuesto (ISV %) *</Label>
                  <Input
                    id="isvPercent"
                    type="number"
                    step="0.1"
                    value={isvPercent}
                    onChange={(e) => setIsvPercent(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <p className="text-gray-600">
                    Porcentaje de impuesto que se aplicar? a las ventas y cotizaciones
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Product Catalog Tab */}
        <TabsContent value="catalog">
          <ProductCatalogTab />
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages" className="settings-packages-panel">
          <div className="settings-packages-grid">
            <Card className="settings-package-card settings-package-builder">
              <CardHeader className="settings-package-header">
                <div>
                  <CardTitle>Paquetes predefinidos</CardTitle>
                  <CardDescription>Define paquetes como stickers, camisetas u otros productos para seleccionarlos rapido dentro del flujo de pedidos.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="settings-package-form">
                <div className="settings-package-fields">
                  <div className="space-y-2">
                    <Label>Nombre del paquete *</Label>
                    <Input
                      value={newPackageName}
                      onChange={(e) => setNewPackageName(e.target.value)}
                      placeholder="100 Stickers por tamano"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de producto *</Label>
                    <Input
                      value={newPackageType}
                      onChange={(e) => setNewPackageType(e.target.value)}
                      placeholder="Sticker"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descripcion opcional</Label>
                  <Textarea
                    value={newPackageDescription}
                    onChange={(e) => setNewPackageDescription(e.target.value)}
                    rows={2}
                    placeholder="Ej: Paquetes estandar para stickers redondos"
                  />
                </div>
                <div className="settings-package-toggle">
                  <div>
                    <Label className="text-sm text-gray-900">Activo</Label>
                    <p className="text-xs text-gray-600">Disponible para pedidos</p>
                  </div>
                  <Switch
                    checked={newPackageActive}
                    onCheckedChange={(checked) => setNewPackageActive(!!checked)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Formas disponibles</Label>
                  <div className="settings-package-chips">
                    {Object.entries(shapeSelection).map(([shape, enabled]) => (
                      <Button
                        key={shape}
                        variant={enabled ? 'primary' : 'outline'}
                        size="sm"
                        className={`settings-package-chip capitalize ${enabled ? 'is-selected' : ''}`}
                        onClick={() => setShapeSelection((prev) => ({ ...prev, [shape]: !prev[shape] }))}
                      >
                        {shape}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Medidas (texto)</Label>
                  <div className="settings-inline-add">
                    <Input
                      value={sizeHeaderInput}
                      onChange={(e) => setSizeHeaderInput(e.target.value)}
                      placeholder="Ej: 5 cm"
                    />
                    <Button size="sm" className="settings-inline-add-button" onClick={addSizeHeader}>
                      <Plus className="w-4 h-4" />
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newPackageSizeHeaders.map((header) => (
                      <Badge
                        key={header}
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => removeSizeHeader(header)}
                      >
                        {header}
                        <span className="text-xs opacity-70">(Eliminar)</span>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="settings-package-row-grid">
                    <div className="space-y-2">
                      <Label>Etiqueta (ej: 100 stickers)</Label>
                      <Input
                        value={newRowDraft.quantityLabel}
                        onChange={(e) => setNewRowDraft({ ...newRowDraft, quantityLabel: e.target.value })}
                        placeholder="Etiqueta"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newRowDraft.quantity || ''}
                        onChange={(e) => setNewRowDraft({ ...newRowDraft, quantity: parseInt(e.target.value) || 0 })}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio del paquete por medida</Label>
                      <div className="space-y-2">
                        {newPackageSizeHeaders.map((header) => (
                          <Input
                            key={header}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={header}
                            value={newRowDraft.prices[header] || ''}
                            onChange={(e) => updateRowPrice(header, e.target.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button onClick={addPackageRow} className="settings-add-row-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar fila
                  </Button>
                </div>
                {newPackageRows.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Previsualizacion de filas</p>
                    <div className="space-y-1">
                      {newPackageRows.map((row) => (
                        <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{row.quantityLabel}</p>
                            <p className="text-xs text-gray-500">Cantidad: {row.quantity}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                              {Object.entries(row.prices).map(([header, price]) => (
                                <span key={header} className="bg-gray-100 px-2 py-0.5 rounded">
                                  {header}: L {price.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button onClick={handleAddPackage} className="settings-save-package-button w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar paquete
                </Button>
              </CardContent>
            </Card>
            <Card className="settings-package-card settings-package-saved">
              <CardHeader className="settings-package-header">
                <CardTitle>Paquetes guardados</CardTitle>
                <CardDescription>Selecciona cualquier paquete para ver sus filas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {productPackages.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay paquetes guardados aun</p>
                ) : (
                  <div className="space-y-3">
                    {productPackages.map((pkg) => (
                      <div key={pkg.id} className="rounded-2xl border border-gray-200 p-4 space-y-2 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm text-gray-600">Tipo {pkg.productType}</p>
                            <h3 className="text-lg font-semibold">{pkg.name}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={pkg.activo === false ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800'}>
                              {pkg.activo === false ? 'Inactivo' : 'Activo'}
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePackage(pkg.id)}>
                              Eliminar
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap text-xs">
                          {pkg.shapes.map((shape) => (
                            <Badge key={shape}>{shape}</Badge>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">
                          Medidas: {pkg.sizeHeaders.join(', ')}
                        </div>
                        <div className="space-y-2 text-xs text-gray-700">
                          {pkg.rows.map((row) => (
                            <div key={row.id} className="flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-2">
                              <span className="font-semibold">{row.quantityLabel}</span>
                              <span>Cantidad: {row.quantity}</span>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(row.prices).map(([header, price]) => (
                                  <span key={header} className="bg-gray-100 px-2 py-0.5 rounded">
                                    {header}: L {price.toFixed(2)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prices Tab */}
        <TabsContent value="prices">
          <PriceConfigTab />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <UsersTab currentUser={user} />
        </TabsContent>
        <TabsContent value="notifications" className="settings-notifications-panel">
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones</CardTitle>
              <CardDescription>Activa o desactiva los tipos de notificacion que deseas ver.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <Label className="text-sm text-gray-900">Movimientos de pedidos</Label>
                  <p className="text-xs text-gray-600">Cambios de estado y movimientos internos.</p>
                </div>
                <Switch
                  checked={notificationSettings.order_movements}
                  onCheckedChange={(checked) => handleNotificationToggle('order_movements', !!checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <Label className="text-sm text-gray-900">Pedidos nuevos</Label>
                  <p className="text-xs text-gray-600">Alertas cuando se crea un pedido.</p>
                </div>
                <Switch
                  checked={notificationSettings.new_orders}
                  onCheckedChange={(checked) => handleNotificationToggle('new_orders', !!checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <Label className="text-sm text-gray-900">Pagos y abonos</Label>
                  <p className="text-xs text-gray-600">Confirmaciones de pagos recibidos.</p>
                </div>
                <Switch
                  checked={notificationSettings.payment_updates}
                  onCheckedChange={(checked) => handleNotificationToggle('payment_updates', !!checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <Label className="text-sm text-gray-900">Pedidos vencidos</Label>
                  <p className="text-xs text-gray-600">Alertas de pedidos fuera de fecha.</p>
                </div>
                <Switch
                  checked={notificationSettings.overdue_orders}
                  onCheckedChange={(checked) => handleNotificationToggle('overdue_orders', !!checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <Label className="text-sm text-gray-900">Pedidos por vencer</Label>
                  <p className="text-xs text-gray-600">Alertas de proximos vencimientos.</p>
                </div>
                <Switch
                  checked={notificationSettings.expiring_orders}
                  onCheckedChange={(checked) => handleNotificationToggle('expiring_orders', !!checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <Label className="text-sm text-gray-900">Stock bajo</Label>
                  <p className="text-xs text-gray-600">Alertas de inventario bajo.</p>
                </div>
                <Switch
                  checked={notificationSettings.stock_low}
                  onCheckedChange={(checked) => handleNotificationToggle('stock_low', !!checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <Label className="text-sm text-gray-900">Cierre de dia</Label>
                  <p className="text-xs text-gray-600">Confirmaciones de cierre de caja.</p>
                </div>
                <Switch
                  checked={notificationSettings.close_day}
                  onCheckedChange={(checked) => handleNotificationToggle('close_day', !!checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <Label className="text-sm text-gray-900">Sincronizacion de Trello</Label>
                  <p className="text-xs text-gray-600">Notificaciones de sincronizacion automatica.</p>
                </div>
                <Switch
                  checked={notificationSettings.trello_sync}
                  onCheckedChange={(checked) => handleNotificationToggle('trello_sync', !!checked)}
                />
              </div>
              <div className="flex justify-center mt-6 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  size="lg"
                  className="border-green-300 bg-green-50 text-green-950 hover:bg-green-100 shadow-sm"
                  onClick={handleSaveNotifications}
                >
                  <Save className="w-5 h-5 mr-2" />
                  Guardar Notificaciones
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity-log">
          <ActivityLogView embedded />
        </TabsContent>

        {/* System Tab - Solo para administradores */}
        {user?.role === 'admin' && (
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Sistema - Administracion Avanzada</CardTitle>
                <CardDescription>Opciones de administracion y mantenimiento del sistema (solo administradores).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Actualizaciones */}
                <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <Settings className="w-5 h-5 text-blue-700 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Actualizaciones</h3>
                      <p className="text-sm text-blue-800">Buscar e instalar actualizaciones de EsmarkSystem.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => window.esmarkUpdates?.check()}
                    >
                      Buscar actualizaciones
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-100"
                      onClick={() => window.esmarkUpdates?.install()}
                    >
                      Reiniciar y actualizar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Correlativos Tab */}
        <TabsContent value="correlativos">
          <div className="space-y-6">
            <div>
              <h2 className="text-gray-900 mb-2">Sistema de Correlativos</h2>
              <p className="text-gray-600">
                Gestion automatica de numeracion consecutiva para Facturas, Recibos y Cotizaciones
              </p>
            </div>
            
            {/* Estado actual de los correlativos */}
            <CorrelativeStatus />
            
            {/* Informacion adicional */}
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-2"> Informacion del Sistema</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    <strong>Correlativos:</strong> La numeracion consecutiva vigente se maneja desde el modulo actual de facturacion. Las series fiscales antiguas ya no se usan en ingreso de pedidos.
                  </p>
                  <p>
                    <strong>Numeracion Segura:</strong> El sistema garantiza que no habra numeros duplicados 
                    gracias a locks atomicos en el backend.
                  </p>
                  <p>
                    <strong>Documentos Anulados:</strong> Los numeros de documentos anulados NO se reutilizan 
                    para mantener la integridad de la auditoria.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

