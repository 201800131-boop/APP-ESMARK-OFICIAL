/**
 * Componente para subir plantillas con drag & drop
 */

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, FileText, Upload, X } from 'lucide-react';

interface UploadAreaProps {
  type: 'factura' | 'recibo' | 'cotizacion';
  onUpload: (file: File, name: string, type: 'factura' | 'recibo' | 'cotizacion') => Promise<void>;
  uploading: boolean;
}

export default function UploadArea({ type, onUpload, uploading }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const validTypes = ['application/pdf'];
    if (!validTypes.includes(file.type)) {
      return 'Tipo de archivo no valido. Solo PDF.';
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'Archivo muy grande. Maximo 5MB.';
    }

    return null;
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setError('');

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);

    if (!templateName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTemplateName(nameWithoutExt);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile || !templateName.trim()) {
      setError('Por favor selecciona un archivo y proporciona un nombre.');
      return;
    }

    try {
      await onUpload(selectedFile, templateName.trim(), type);
      setSelectedFile(null);
      setTemplateName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // El error se maneja en el componente padre
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setTemplateName('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'factura':
        return 'Factura';
      case 'recibo':
        return 'Recibo';
      case 'cotizacion':
        return 'Cotizacion';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subir Plantilla de {getTypeLabel()}
        </CardTitle>
        <CardDescription>Arrastra un archivo PDF (max. 5MB)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'} ${selectedFile ? 'bg-green-50 border-green-300' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <FileText className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-green-800">
                <strong>{selectedFile.name}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-red-600 hover:text-red-700"
              >
                <X className="mr-1 h-4 w-4" />
                Quitar archivo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className={`h-12 w-12 mx-auto ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="text-gray-700">
                <strong>Arrastra un archivo aqui</strong>
              </p>
              <p className="text-sm text-gray-500">o haz clic para seleccionar</p>
              <p className="text-xs text-gray-400 mt-2">PDF (max. 5MB)</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="space-y-2">
          <Label htmlFor="template-name">Nombre de la plantilla</Label>
          <Input
            id="template-name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder={`Ej: Plantilla ${getTypeLabel()} 2024`}
            disabled={uploading}
          />
        </div>

        <Button
          onClick={handleUploadClick}
          disabled={!selectedFile || !templateName.trim() || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir Plantilla
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
// Archivo eliminado. Migrado a Facturacion.
