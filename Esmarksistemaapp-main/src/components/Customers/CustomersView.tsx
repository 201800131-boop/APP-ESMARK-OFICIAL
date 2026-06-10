import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, FileText, UserCheck, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { listCustomers, deleteCustomer } from '../../utils/api/customers';
import CustomerDialog from './CustomerDialog';
import type { Customer } from '../../types/customer';

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      setFilteredCustomers(customers);
      return;
    }

    setFilteredCustomers(
      customers.filter((customer) =>
        [
          customer.name,
          customer.phone,
          customer.email,
          customer.rtn,
          customer.address,
          customer.notes,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      )
    );
  }, [search, customers]);

  const customerStats = useMemo(() => {
    const withPhone = customers.filter((customer) => customer.phone?.trim()).length;
    const withRtn = customers.filter((customer) => customer.rtn?.trim()).length;
    const recent = customers.filter((customer) => {
      if (!customer.created_at) return false;
      const createdAt = new Date(customer.created_at).getTime();
      return Number.isFinite(createdAt) && Date.now() - createdAt <= 30 * 24 * 60 * 60 * 1000;
    }).length;

    return { total: customers.length, withPhone, withRtn, recent };
  }, [customers]);

  async function loadCustomers() {
    try {
      setLoading(true);
      const data = await listCustomers();
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingCustomer(null);
    setDialogOpen(true);
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer);
    setDialogOpen(true);
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Eliminar cliente "${customer.name}"?\n\nEsta accion no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteCustomer(customer.id);
      toast.success('Cliente eliminado correctamente');
      await loadCustomers();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar cliente');
    }
  }

  function handleDialogClose(reload: boolean) {
    setDialogOpen(false);
    setEditingCustomer(null);
    if (reload) {
      loadCustomers();
    }
  }

  const emptyTitle = search ? 'No encontramos clientes' : 'Aun no hay clientes';
  const emptyCopy = search
    ? 'Prueba con otro nombre, telefono, correo, RTN o direccion.'
    : 'Crea tu primer cliente para reutilizar sus datos en pedidos y cotizaciones.';

  return (
    <div className="app-page customers-page">
      <section className="customers-hero">
        <div className="customers-hero-main">
          <div className="customers-hero-icon">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1>Clientes</h1>
            <p>Directorio centralizado para pedidos, cotizaciones y facturacion.</p>
          </div>
        </div>

        <Button onClick={handleCreate} className="customers-primary-button">
          <Plus className="w-4 h-4" />
          Nuevo cliente
        </Button>
      </section>

      <section className="customers-stats-grid">
        <div className="customers-stat-card is-total">
          <span><Users className="h-4 w-4" /></span>
          <div>
            <p>Total clientes</p>
            <strong>{customerStats.total}</strong>
          </div>
        </div>
        <div className="customers-stat-card">
          <span><Phone className="h-4 w-4" /></span>
          <div>
            <p>Con telefono</p>
            <strong>{customerStats.withPhone}</strong>
          </div>
        </div>
        <div className="customers-stat-card">
          <span><FileText className="h-4 w-4" /></span>
          <div>
            <p>Con RTN</p>
            <strong>{customerStats.withRtn}</strong>
          </div>
        </div>
        <div className="customers-stat-card">
          <span><Clock className="h-4 w-4" /></span>
          <div>
            <p>Nuevos 30 dias</p>
            <strong>{customerStats.recent}</strong>
          </div>
        </div>
      </section>

      <Card className="customers-toolbar">
        <CardContent>
          <div className="customers-search-wrap">
            <Search className="h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar por nombre, telefono, email, RTN, direccion o notas..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Limpiar busqueda">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="customers-toolbar-count">
            {loading ? 'Cargando...' : `${filteredCustomers.length} de ${customers.length} clientes`}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="customers-empty-card">
          <CardContent>
            <div className="customers-loading-dot" />
            <p>Cargando clientes...</p>
          </CardContent>
        </Card>
      ) : filteredCustomers.length === 0 ? (
        <Card className="customers-empty-card">
          <CardContent>
            <div className="customers-empty-icon">
              <UserCheck className="h-7 w-7" />
            </div>
            <h3>{emptyTitle}</h3>
            <p>{emptyCopy}</p>
            {!search && (
              <Button onClick={handleCreate} className="customers-primary-button">
                <Plus className="w-4 h-4" />
                Crear cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <section className="customers-grid">
          {filteredCustomers.map((customer) => (
            <article key={customer.id} className="customer-card">
              <div className="customer-card-header">
                <div className="customer-avatar">
                  {customer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="customer-title">
                  <h3>{customer.name}</h3>
                  <p>{customer.rtn ? `RTN ${customer.rtn}` : 'RTN opcional'}</p>
                </div>
                <div className="customer-actions">
                  <button type="button" onClick={() => handleEdit(customer)} title="Editar cliente">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(customer)} title="Eliminar cliente" className="is-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="customer-contact-list">
                <div className={customer.phone ? '' : 'is-muted'}>
                  <Phone className="h-4 w-4" />
                  <span>{customer.phone || 'Sin telefono'}</span>
                </div>
                <div className={customer.email ? '' : 'is-muted'}>
                  <Mail className="h-4 w-4" />
                  <span>{customer.email || 'Sin email'}</span>
                </div>
                <div className={customer.address ? '' : 'is-muted'}>
                  <MapPin className="h-4 w-4" />
                  <span>{customer.address || 'Sin direccion'}</span>
                </div>
              </div>

              {customer.notes && (
                <div className="customer-notes">
                  {customer.notes}
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      {dialogOpen && (
        <CustomerDialog
          customer={editingCustomer}
          onClose={handleDialogClose}
        />
      )}
    </div>
  );
}
