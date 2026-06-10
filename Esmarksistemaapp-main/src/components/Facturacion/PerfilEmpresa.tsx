import React, { useState } from 'react';
import { useApp } from './context/AppContext';

export function PerfilEmpresa() {
  const { state, updateEmpresaInfo } = useApp();
  const [formData, setFormData] = useState(state.empresaInfo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmpresaInfo(formData);
    alert('Informacion de empresa actualizada exitosamente');
  };

  const readImageAsPrintablePng = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const rawData = reader.result as string;
        const image = new Image();
        image.onload = () => {
          const width = image.naturalWidth || 512;
          const height = image.naturalHeight || 512;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');

          if (!context) {
            resolve(rawData);
            return;
          }

          context.clearRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = () => resolve(rawData);
        image.src = rawData;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const logoData = await readImageAsPrintablePng(file);
      setFormData({ ...formData, logo: logoData });
    } catch (error) {
      console.error('No se pudo cargar el logo', error);
      alert('No se pudo cargar el logo. Intenta con otra imagen.');
    }
  };

  const handleFirmaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const firmaData = await readImageAsPrintablePng(file);
      setFormData({ ...formData, firma: firmaData });
    } catch (error) {
      console.error('No se pudo cargar la firma', error);
      alert('No se pudo cargar la firma. Intenta con otra imagen.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 facturacion-profile-screen">
      <div className="facturacion-profile-header">
        <div>
          <h2>Informacion de la empresa</h2>
          <p>
            Datos fiscales y visuales que apareceran en facturas, proformas y recibos.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="facturacion-profile-form">
        <div className="facturacion-profile-fields">
          <label htmlFor="nombre-comercial">
            Nombre comercial
            <input
              type="text"
              id="nombre-comercial"
              value={formData.nombreComercial}
              onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
              placeholder="Esmark Media"
            />
          </label>

          <label htmlFor="razon-social">
            Razon social
            <input
              type="text"
              id="razon-social"
              value={formData.razonSocial}
              onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
              placeholder="Empresa S.A."
            />
          </label>

          <label htmlFor="rtn">
            RTN
            <input
              type="text"
              id="rtn"
              value={formData.rtn}
              onChange={(e) => setFormData({ ...formData, rtn: e.target.value })}
              placeholder="0000-0000-000000"
            />
          </label>

          <label htmlFor="telefono">
            Telefono
            <input
              type="tel"
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="+504 9999-0000"
            />
          </label>

          <label htmlFor="email">
            Correo electronico
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="facturas@empresa.com"
            />
          </label>

          <label htmlFor="direccion">
            Direccion fiscal
            <textarea
              id="direccion"
              rows={2}
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              placeholder="Boulevard Principal 123, Ciudad"
            />
          </label>
        </div>

        <div className="facturacion-profile-previews">
          <section className="facturacion-upload-card">
            <div>
              <h3>Logo para facturas y recibos</h3>
              <p>JPG, PNG, WEBP o SVG. Max 5MB.</p>
            </div>
            <div className="facturacion-preview-box">
              {formData.logo ? (
                <img src={formData.logo} alt="Logo" className="facturacion-logo-preview" />
              ) : (
                <span>Sin logo</span>
              )}
            </div>
            <label className="facturacion-upload-button">
              Cambiar logo
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
          </section>

          <section className="facturacion-upload-card">
            <div>
              <h3>Firma autorizada para recibos</h3>
              <p>Se usara en la vista previa y en recibos impresos.</p>
            </div>
            <div className="facturacion-preview-box">
              {formData.firma ? (
                <img src={formData.firma} alt="Firma" className="facturacion-signature-preview" />
              ) : (
                <span>Sin firma</span>
              )}
            </div>
            <label className="facturacion-upload-button">
              {formData.firma ? 'Cambiar firma' : 'Subir firma'}
              <input type="file" accept="image/*" onChange={handleFirmaChange} className="hidden" />
            </label>
          </section>
        </div>

        <div className="facturacion-profile-actions">
          <button type="submit">Actualizar informacion</button>
        </div>
      </form>
    </div>
  );
}
