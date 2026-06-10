import React, { useState } from 'react';
import { useApp, Producto, Cliente, Factura } from './context/AppContext';
import { GenerarRecibo } from './GenerarRecibo';
import { generateFacturaPDF } from './utils/facturaCartaPdf';

function GenerarFactura() {
  const { state, addFactura, addCliente } = useApp();
  const [cliente, setCliente] = useState<Cliente>({
    tipo: 'consumidor-final',
    nombre: 'Consumidor final',
    rtn: '',
    email: '',
    telefono: '',
    direccion: '',
  });

  const [showClienteModal, setShowClienteModal] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState<Cliente>({
    tipo: 'empresa',
    nombre: '',
    rtn: '',
    email: '',
    telefono: '',
    direccion: '',
  });

  const [productRows, setProductRows] = useState<Producto[]>([
    { id: '1', nombre: '', cantidad: 1, precio: 0, descuento: 0, impuesto: 15 }
  ]);

  const [nota, setNota] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [horaEmision, setHoraEmision] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const addProductRow = () => {
    setProductRows([
      ...productRows,
      { id: Date.now().toString(), nombre: '', cantidad: 1, precio: 0, descuento: 0, impuesto: 15 }
    ]);
  };

  const removeProductRow = (id: string) => {
    if (productRows.length > 1) {
      setProductRows(productRows.filter(row => row.id !== id));
    }
  };

  const updateProductRow = (id: string, field: keyof Producto, value: any) => {
    setProductRows(productRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const validProducts = productRows.filter((producto) =>
    producto.nombre.trim() && Number(producto.cantidad) > 0 && Number(producto.precio) > 0
  );

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
  };

  const validateFactura = (requireFiscalData: boolean) => {
    if (!cliente.nombre.trim()) {
      showNotice('error', 'El nombre del cliente es requerido.');
      return false;
    }

    if (validProducts.length === 0) {
      showNotice('error', 'Agregue al menos un producto o servicio con nombre, cantidad y precio.');
      return false;
    }

    if (requireFiscalData) {
      const missingFiscalData = [
        state.datosFiscales.cai,
        state.datosFiscales.prefijo,
        state.datosFiscales.primerNumero,
        state.datosFiscales.ultimoNumero,
        state.datosFiscales.siguienteFactura,
        state.datosFiscales.fechaExpiracion,
      ].some((value) => !String(value || '').trim());

      if (missingFiscalData) {
        showNotice('error', 'Complete los datos fiscales antes de emitir una factura.');
        return false;
      }
    }

    return true;
  };

  const calculateRowTotal = (producto: Producto) => {
    const subtotal = producto.cantidad * producto.precio;
    const descuento = subtotal * (producto.descuento / 100);
    const afterDiscount = subtotal - descuento;
    const impuesto = afterDiscount * (producto.impuesto / 100);
    return afterDiscount + impuesto;
  };

  const calculateTotals = () => {
    const subtotal = validProducts.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
    const descuento = validProducts.reduce((sum, p) => sum + (p.cantidad * p.precio * p.descuento / 100), 0);
    const impuestos = validProducts.reduce((sum, p) => {
      const afterDiscount = (p.cantidad * p.precio) - (p.cantidad * p.precio * p.descuento / 100);
      return sum + (afterDiscount * p.impuesto / 100);
    }, 0);
    const envio = 0;
    const total = subtotal - descuento + impuestos + envio;

    return { subtotal, descuento, impuestos, envio, total };
  };

  const totals = calculateTotals();

  const handleSaveProforma = () => {
    if (!validateFactura(false)) return;

    addFactura({
      tipo: 'proforma',
      cliente,
      productos: validProducts,
      nota,
      ...totals,
    });
    showNotice('success', 'Proforma guardada correctamente.');
    resetForm();
  };

  const handleSaveFactura = () => {
    if (!validateFactura(true)) return;

    const facturaEmitida: Omit<Factura, 'id' | 'fechaCreacion'> = {
      tipo: 'emitida',
      numeroFactura: `${state.datosFiscales.prefijo}-${state.datosFiscales.siguienteFactura}`,
      estado: 'Emitida',
      cliente,
      productos: validProducts,
      nota,
      fechaEmision,
      ...totals,
    };

    addFactura(facturaEmitida);

    const pdf = generateFacturaPDF(
      {
        ...facturaEmitida,
        id: 'emitida-preview',
        fechaCreacion: new Date().toISOString(),
      },
      state.empresaInfo,
      state.datosFiscales,
      state.disenoConfig
    );
    pdf.save(`factura-original-${facturaEmitida.numeroFactura}.pdf`);

    showNotice('success', `Factura ${facturaEmitida.numeroFactura} emitida y descargada.`);
    resetForm();
  };

  const resetForm = () => {
    setCliente({
      tipo: 'consumidor-final',
      nombre: 'Consumidor final',
      rtn: '',
      email: '',
      telefono: '',
      direccion: '',
    });
    setProductRows([
      { id: Date.now().toString(), nombre: '', cantidad: 1, precio: 0, descuento: 0, impuesto: 15 }
    ]);
    setNota('');
  };

  const handleDownload = () => {
    if (!validateFactura(false)) return;

    const previewFactura: Factura = {
      id: 'preview',
      tipo: 'proforma',
      cliente,
      productos: validProducts,
      nota,
      fechaCreacion: new Date().toISOString(),
      fechaEmision,
      subtotal: totals.subtotal,
      descuento: totals.descuento,
      impuestos: totals.impuestos,
      envio: totals.envio,
      total: totals.total,
    };

    const pdf = generateFacturaPDF(previewFactura, state.empresaInfo, state.datosFiscales, state.disenoConfig);
    pdf.save(`factura-preview.pdf`);
  };

  const handleSaveNuevoCliente = () => {
    if (!nuevoCliente.nombre) {
      showNotice('error', 'El nombre del cliente es requerido.');
      return;
    }
    addCliente(nuevoCliente);
    setCliente(nuevoCliente);
    setShowClienteModal(false);
    setNuevoCliente({
      tipo: 'empresa',
      nombre: '',
      rtn: '',
      email: '',
      telefono: '',
      direccion: '',
    });
    showNotice('success', 'Cliente guardado correctamente.');
  };

  const handleSelectCliente = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nombreCliente = e.target.value;
    if (nombreCliente === 'consumidor-final') {
      setCliente({
        tipo: 'consumidor-final',
        nombre: 'Consumidor final',
        rtn: '',
        email: '',
        telefono: '',
        direccion: '',
      });
    } else if (nombreCliente === 'nuevo') {
      setShowClienteModal(true);
    } else {
      const clienteGuardado = state.clientesGuardados.find(c => c.nombre === nombreCliente);
      if (clienteGuardado) {
        setCliente(clienteGuardado);
      }
    }
  };

  const handleSend = () => {
    if (!cliente.email) {
      showNotice('error', 'Ingrese un correo electronico del cliente.');
      return;
    }
    showNotice('success', `Factura lista para enviar a ${cliente.email}.`);
  };

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-2">
          {/* Left Column - Company Info */}
          <div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">{state.empresaInfo.razonSocial}</span>{' '}
                <span className="text-gray-400">RTN: {state.empresaInfo.rtn}</span>
              </p>
              <p className="text-xs text-gray-500">{state.empresaInfo.direccion}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de emisión
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                />
                <input
                  type="time"
                  value={horaEmision}
                  onChange={(e) => setHoraEmision(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Company Logo */}
          <div className="flex justify-center lg:justify-end">
            <div className="facturacion-form-logo">
              {state.empresaInfo.logo ? (
                <img
                  src={state.empresaInfo.logo}
                  alt="Logo de la empresa"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span>Logo</span>
              )}
            </div>
          </div>
        </div>

        {/* Cliente Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Cliente</h3>
            <button
              type="button"
              onClick={() => setShowClienteModal(true)}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
            >
              + Agregar cliente
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar cliente
            </label>
            <select
              value={cliente.tipo === 'consumidor-final' ? 'consumidor-final' : cliente.nombre}
              onChange={handleSelectCliente}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
            >
              <option value="consumidor-final">Consumidor final</option>
              {state.clientesGuardados.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={cliente.nombre}
                onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                placeholder={cliente.tipo === 'consumidor-final' ? 'Consumidor final' : 'Nombre del cliente'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RTN
              </label>
              <input
                type="text"
                value={cliente.rtn}
                onChange={(e) => setCliente({ ...cliente, rtn: e.target.value })}
                placeholder="0000-0000-000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={cliente.email}
                onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                placeholder="cliente@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={cliente.telefono}
                onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                placeholder="+504 9999-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={cliente.direccion}
                onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })}
                placeholder="Dirección del cliente"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
              />
            </div>
          </div>
        </div>

        {/* Productos / Servicios */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Productos / Servicios</h3>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="whitespace-nowrap text-left py-2 px-2 font-medium text-gray-700">Producto/Servicio</th>
                  <th className="whitespace-nowrap text-center py-2 px-2 font-medium text-gray-700">Cantidad</th>
                  <th className="whitespace-nowrap text-center py-2 px-2 font-medium text-gray-700">Precio</th>
                  <th className="whitespace-nowrap text-center py-2 px-2 font-medium text-gray-700">Descuento %</th>
                  <th className="whitespace-nowrap text-center py-2 px-2 font-medium text-gray-700">Impuesto (ISV) %</th>
                  <th className="whitespace-nowrap text-center py-2 px-2 font-medium text-gray-700">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-200">
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={row.nombre}
                        onChange={(e) => updateProductRow(row.id, 'nombre', e.target.value)}
                        placeholder="Ingrese el nombre de un producto"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1976D2]"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="1"
                        value={row.cantidad}
                        onChange={(e) => updateProductRow(row.id, 'cantidad', parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#1976D2]"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.precio}
                        onChange={(e) => updateProductRow(row.id, 'precio', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#1976D2]"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.descuento}
                        onChange={(e) => updateProductRow(row.id, 'descuento', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#1976D2]"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={row.impuesto}
                        onChange={(e) => updateProductRow(row.id, 'impuesto', parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1976D2]"
                      >
                        <option value={0}>0%</option>
                        <option value={15}>15%</option>
                        <option value={18}>18%</option>
                      </select>
                    </td>
                    <td className="py-3 px-2 text-center text-gray-700 font-medium">
                      L{calculateRowTotal(row).toFixed(2)}
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => removeProductRow(row.id)}
                        disabled={productRows.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addProductRow}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
          >
            + Agregar artículo
          </button>
        </div>

        {/* Totals Section */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nota (opcional)
            </label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={4}
              placeholder="Agregar notas adicionales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2] resize-none"
            />
          </div>

          <div className="space-y-2 text-sm">
            {notice && (
              <div
                className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                  notice.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {notice.message}
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-medium">L{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-700">Descuento:</span>
              <span className="font-medium">-L{totals.descuento.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-700">Impuestos:</span>
              <span className="font-medium">L{totals.impuestos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-700">Envío:</span>
              <span className="font-medium">L{totals.envio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-gray-300 mt-2">
              <span className="font-semibold text-gray-900">TOTAL:</span>
              <span className="font-bold text-lg">L{totals.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            onClick={handleSaveProforma}
            className="px-6 py-2.5 bg-[#1976D2] text-white rounded-lg hover:bg-[#1565C0] transition-colors"
          >
            Guardar proforma
          </button>
          <button
            onClick={handleSaveFactura}
            className="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Emitir factura
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Descargar
          </button>
          <button
            onClick={handleSend}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Enviar
          </button>
        </div>

        {/* Modal Agregar Cliente */}
        {showClienteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Agregar nuevo cliente</h3>
                <button
                  onClick={() => setShowClienteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre / Razón social *
                    </label>
                    <input
                      type="text"
                      value={nuevoCliente.nombre}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                      placeholder="Nombre del cliente o empresa"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RTN
                    </label>
                    <input
                      type="text"
                      value={nuevoCliente.rtn}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, rtn: e.target.value })}
                      placeholder="0000-0000-000000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <textarea
                    value={nuevoCliente.direccion}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
                    placeholder="Dirección completa"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={nuevoCliente.telefono}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                      placeholder="+504 9999-0000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={nuevoCliente.email}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                      placeholder="cliente@email.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1976D2]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowClienteModal(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNuevoCliente}
                  className="px-6 py-2.5 bg-[#1976D2] text-white rounded-lg hover:bg-[#1565C0] transition-colors"
                >
                  Guardar cliente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CrearFactura() {
  const [activeTab, setActiveTab] = useState('factura');

  const tabs = [
    { id: 'factura', label: 'Factura' },
    { id: 'recibo', label: 'Recibo' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm facturacion-create-screen">
      {/* Secondary Tabs */}
      <div className="border-b border-gray-200">
        <div className="facturacion-subtabs-buttons flex gap-3 px-6 pt-4 pb-3 md:px-8 md:pt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                min-w-[120px] rounded-lg px-4 py-2 text-center text-sm font-semibold transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-[#1976D2] text-white shadow-sm'
                    : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="facturacion-subtab-content p-8">
        {activeTab === 'factura' && <GenerarFactura />}
        {activeTab === 'recibo' && <GenerarRecibo />}
      </div>
    </div>
  );
}
