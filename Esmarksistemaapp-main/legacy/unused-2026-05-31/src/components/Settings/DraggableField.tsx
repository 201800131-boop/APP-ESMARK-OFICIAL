import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface DraggableFieldProps {
  field: any;
  fieldInfo: any;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragEnd: (x: number, y: number) => void;
  onResizeEnd: (width: number, height: number) => void;
  onRemove: () => void;
  // ✨ NUEVO: Callbacks para prevenir duplicación
  onDragStart?: () => void;
  onDragComplete?: () => void;
  onToggleShowLabel?: (fieldId: string) => void;
  // ✨ NUEVO: Sistema de selección
  isSelected?: boolean;
  onToggleSelection?: (fieldId: string) => void;
}

export default function DraggableField({ 
  field, 
  fieldInfo, 
  containerRef, 
  onDragEnd, 
  onResizeEnd, 
  onRemove,
  onDragStart,
  onDragComplete,
  onToggleShowLabel,
  isSelected = false,
  onToggleSelection
}: DraggableFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current && fieldRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Calcular nueva posición basada en el mouse menos el offset
        let newLeft = e.clientX - containerRect.left - dragOffset.x;
        let newTop = e.clientY - containerRect.top - dragOffset.y;
        
        // Limitar dentro del contenedor
        newLeft = Math.max(0, Math.min(newLeft, containerRect.width - fieldRef.current.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, containerRect.height - fieldRef.current.offsetHeight));
        
        fieldRef.current.style.left = `${newLeft}px`;
        fieldRef.current.style.top = `${newTop}px`;
      } else if (isResizing && containerRef.current && fieldRef.current) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width + deltaX;
        let newHeight = resizeStart.height + deltaY;
        
        // Tamaño mínimo
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(30, newHeight);
        
        // No exceder contenedor
        const containerRect = containerRef.current.getBoundingClientRect();
        const fieldRect = fieldRef.current.getBoundingClientRect();
        const maxWidth = containerRect.width - (fieldRect.left - containerRect.left);
        const maxHeight = containerRect.height - (fieldRect.top - containerRect.top);
        
        newWidth = Math.min(newWidth, maxWidth);
        newHeight = Math.min(newHeight, maxHeight);
        
        fieldRef.current.style.width = `${newWidth}px`;
        fieldRef.current.style.height = `${newHeight}px`;
      }
    };

    const handleMouseUp = () => {
      if (isDragging && containerRef.current && fieldRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const fieldRect = fieldRef.current.getBoundingClientRect();
        
        const finalLeft = fieldRect.left - containerRect.left;
        const finalTop = fieldRect.top - containerRect.top;
        
        onDragEnd(finalLeft, finalTop);
        setIsDragging(false);
        
        // ✨ NUEVO: Esperar 100ms antes de permitir clicks nuevamente para prevenir duplicación
        setTimeout(() => {
          onDragComplete?.();
        }, 100);
      } else if (isResizing && fieldRef.current) {
        const finalWidth = fieldRef.current.offsetWidth;
        const finalHeight = fieldRef.current.offsetHeight;
        
        onResizeEnd(finalWidth, finalHeight);
        setIsResizing(false);
        
        // ✨ NUEVO: También esperar al terminar redimensionar
        setTimeout(() => {
          onDragComplete?.();
        }, 100);
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, containerRef, onDragEnd, onResizeEnd, onDragComplete]);

  const handleDragStart = (e: React.MouseEvent) => {
    // ✨ NUEVO: Si hay Ctrl/Cmd + Click, alternar selección
    if ((e.ctrlKey || e.metaKey) && onToggleSelection) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection(field.id);
      return;
    }
    
    if (e.target === fieldRef.current || (e.target as HTMLElement).tagName === 'SPAN') {
      if (containerRef.current && fieldRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const fieldRect = fieldRef.current.getBoundingClientRect();
        
        // Guardar el offset entre el mouse y la esquina superior izquierda del campo
        const offsetX = e.clientX - fieldRect.left;
        const offsetY = e.clientY - fieldRect.top;
        
        setDragOffset({ x: offsetX, y: offsetY });
        setIsDragging(true);
        
        // ✨ NUEVO: Notificar al padre que empezó el arrastre
        if (onDragStart) {
          onDragStart();
        }
      }
      e.preventDefault();
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    if (fieldRef.current) {
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: fieldRef.current.offsetWidth,
        height: fieldRef.current.offsetHeight
      });
      setIsResizing(true);
      
      // ✨ NUEVO: Notificar al padre que empezó el redimensionamiento
      if (onDragStart) {
        onDragStart();
      }
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const containerWidth = containerRef.current?.offsetWidth || 1;
  const containerHeight = containerRef.current?.offsetHeight || 1;

  return (
    <div
      ref={fieldRef}
      className={`absolute border-2 ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : fieldInfo?.color} ${isSelected ? 'bg-blue-50/90' : 'bg-white/80'} backdrop-blur-sm rounded flex items-center justify-between px-2 py-1 shadow-lg hover:shadow-xl transition-all select-none ${ isDragging || isResizing ? 'cursor-grabbing' : 'cursor-grab' }`}
      style={{
        left: `${(field.x / 100) * containerWidth}px`,
        top: `${(field.y / 100) * containerHeight}px`,
        width: `${(field.width / 100) * containerWidth}px`,
        minHeight: '36px',
        zIndex: isDragging || isResizing ? 1000 : 1,
        // ✨ NUEVO: Aplicar estilos de tipografía del campo
        fontSize: `${field.fontSize || 14}px`,
        fontFamily: field.fontFamily || 'Arial',
        color: field.color || '#000000'
      }}
      onMouseDown={handleDragStart}
    >
      {/* ✨ NUEVO: Checkbox de selección */}
      {onToggleSelection && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(field.id)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-4 h-4 mr-1 cursor-pointer shrink-0"
          title="Seleccionar campo (o Ctrl+Click)"
        />
      )}
      <span className="font-bold truncate flex-1 pointer-events-none">
        {/* ✨ NUEVO: Mostrar etiqueta o solo "{Valor}" según configuración */}
        {field.showLabel === false ? `{Valor}` : fieldInfo?.label}
      </span>
      <div className="flex items-center gap-1">
        {/* ✨ NUEVO: Botón para toggle mostrar/ocultar etiqueta */}
        {onToggleShowLabel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleShowLabel(field.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`text-xs px-1 rounded ${ field.showLabel === false ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-500 text-white hover:bg-gray-600' } shrink-0 z-10`}
            title={field.showLabel === false ? 'Mostrar etiqueta' : 'Ocultar etiqueta (solo valor)'}
          >
            {field.showLabel === false ? 'V' : 'E'}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-red-600 hover:text-red-800 shrink-0 z-10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Handle de redimensionamiento */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-tl cursor-nwse-resize opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeStart}
        style={{ cursor: 'nwse-resize' }}
      />
    </div>
  );
}
