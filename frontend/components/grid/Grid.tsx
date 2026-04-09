"use client";

import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, IGetRowsParams } from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Optional theme CSS

interface GridProps {
  onGridReady: (params: any) => void;
}

const statusBadgeRenderer = (params: any) => {
  const value = params.value;
  if (!value) return '';
  let uiClass = '';
  switch (value) {
    case 'activa': uiClass = 'bg-status-activa-bg text-status-activa-text'; break;
    case 'invalida': uiClass = 'bg-status-invalida-bg text-status-invalida-text'; break;
    case 'eliminada': uiClass = 'bg-status-eliminada-bg text-status-eliminada-text'; break;
    case 'baja': uiClass = 'bg-status-baja-bg text-status-baja-text'; break;
    default: uiClass = 'bg-gray-100 text-gray-700'; break;
  }
  return `<span class="px-2 py-1 rounded text-xs font-semibold ${uiClass}">${value.toUpperCase()}</span>`;
};

const currencyFormatter = (params: any) => {
  if (!params.value) return '-';
  return `S/. ${Number(params.value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const estimatedPriceRenderer = (params: any) => {
  if (!params.value) return '-';
  return `<div class="w-full h-full bg-[#FAFFF8] px-2">${currencyFormatter(params)}</div>`;
};

export default function Grid({ onGridReady }: GridProps) {

  const colDefs: ColDef[] = useMemo(() => [
    { headerName: 'ID', field: 'ficha_id', width: 120, filter: 'agTextColumnFilter', checkboxSelection: true },
    { headerName: 'Nombre', field: 'nombre', width: 250, filter: 'agTextColumnFilter' },
    { headerName: 'Marca', field: 'marca', width: 150, filter: 'agSetColumnFilter' },
    { headerName: 'Acuerdo', field: 'acuerdo', width: 90, filter: 'agSetColumnFilter' },
    { headerName: 'Estado', field: 'estado', width: 120, filter: 'agSetColumnFilter', cellRenderer: statusBadgeRenderer },
    { headerName: 'Precio Oficial', field: 'precio_oficial', width: 130, valueFormatter: currencyFormatter },
    { headerName: 'Precio Estimado', field: 'precio_estimado', width: 130, cellRenderer: estimatedPriceRenderer },
    { headerName: 'Proveedor', field: 'proveedor', width: 200, filter: 'agTextColumnFilter' },
    { headerName: 'Actualización', field: 'updated_at', width: 150, valueFormatter: (p) => new Date(p.value).toLocaleString('es-PE') },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      sortable: true,
      resizable: true,
      flex: 1,
      minWidth: 100,
    };
  }, []);

  return (
    <div className="ag-theme-alpine w-full h-full" style={{ "--ag-font-family": "Inter, sans-serif" } as any}>
      <AgGridReact
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        rowModelType="infinite"
        cacheBlockSize={100}
        maxBlocksInCache={10}
        onGridReady={onGridReady}
        rowSelection="multiple"
        animateRows={true}
        domLayout="normal"
      />
    </div>
  );
}
