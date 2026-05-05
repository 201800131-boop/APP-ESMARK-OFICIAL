import React, { useState } from 'react';
import { useApp } from './context/AppContext';

export function PerfilEmpresa() {
  const { state, updateEmpresaInfo } = useApp();
  const [formData, setFormData] = useState(state.empresaInfo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmpresaInfo(formData);
    alert('Información de empresa actualizada exitosamente');
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const logoData = event.target?.result as string;
      setFormData({ ...formData, logo: logoData });
    };
    reader.readAsDataURL(file);
  };

  const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const firmaData = event.target?.result as string;
      setFormData({ ...formData, firma: firmaData });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="max-w-4xl">
        {/* Header */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Información de la empresa
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          Esta es la información fiscal que se usará en tus facturas emitidas. Asegúrate de que los datos estén correctos, ya que aparecerán exactamente así en cada factura que se genere.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-8">
            {/* Left Column - Form Fields */}
            <div className="space-y-5">
              {/* Nombre comercial */}
              <div>
                <label htmlFor="nombre-comercial" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre comercial
                </label>
                <input
                  type="text"
                  id="nombre-comercial"
                  value={formData.nombreComercial}
                  onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                  placeholder="Empresa Sociedad Anónima"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                />
              </div>

              {/* Razón social */}
              <div>
                <label htmlFor="razon-social" className="block text-sm font-medium text-gray-700 mb-2">
                  Razón social
                </label>
                <input
                  type="text"
                  id="razon-social"
                  value={formData.razonSocial}
                  onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                  placeholder="Empresa S.A."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                />
              </div>

              {/* RTN */}
              <div>
                <label htmlFor="rtn" className="block text-sm font-medium text-gray-700 mb-2">
                  RTN
                </label>
                <input
                  type="text"
                  id="rtn"
                  value={formData.rtn}
                  onChange={(e) => setFormData({ ...formData, rtn: e.target.value })}
                  placeholder="0000-0000-000000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                />
              </div>

              {/* Dirección Fiscal */}
              <div>
                <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección Fiscal
                </label>
                <textarea
                  id="direccion"
                  rows={3}
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Boulevard Principal 123, Ciudad"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent resize-none"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+504 9999-0000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                />
              </div>

              {/* Correo electrónico */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="facturas@empresa.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Column - Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo para facturas
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="flex items-center justify-center mb-4">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" className="w-32 h-32 object-contain" />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">Logo</span>
                    </div>
                  )}
                </div>
                <label className="inline-block mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                  Cambiar logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-3">
                  Formatos: jpg, jpeg, png,<br />gif, webp, svg. Máx 5MB.
                </p>
              </div>
            </div>

            {/* Firma para recibos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Firma autorizada para recibos
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="flex items-center justify-center mb-4">
                  {formData.firma ? (
                    <img src={formData.firma} alt="Firma" className="w-40 h-24 object-contain" />
                  ) : (
                    <div className="w-40 h-24 bg-gray-100 rounded flex items-center justify-center border-2 border-gray-300">
                      <span className="text-gray-400 text-xs">Sin firma</span>
                    </div>
                  )}
                </div>
                <label className="inline-block mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                  {formData.firma ? 'Cambiar firma' : 'Subir firma'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFirmaChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-3">
                  Sube una imagen de la firma<br />autorizada para recibos
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#1976D2] text-white rounded-lg hover:bg-[#1565C0] transition-colors font-medium"
            >
              Actualizar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
