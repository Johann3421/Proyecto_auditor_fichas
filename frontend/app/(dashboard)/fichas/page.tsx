"use client";

import React, { useRef, useCallback } from 'react';
import Grid from '@/components/grid/Grid';
import { IGetRowsParams, GridReadyEvent } from 'ag-grid-community';
import { apiClient } from '@/lib/api-client';

export default function FichasPage() {
  
  const onGridReady = useCallback((params: GridReadyEvent) => {
    const dataSource = {
      getRows: async (rowParams: IGetRowsParams) => {
        try {
          const { startRow, endRow, sortModel, filterModel } = rowParams;
          // Build query string based strictly on backend expectations
          const params = new URLSearchParams();
          params.append("start_row", startRow.toString());
          params.append("end_row", endRow.toString());
          
          if (filterModel && filterModel.estado) {
              // Simplificado: Solo se toma el tipo 'set' o text filter
              if (filterModel.estado.values) params.append("estado", filterModel.estado.values[0]);
          }
          if (filterModel && filterModel.marca) {
              if (filterModel.marca.values) params.append("marca", filterModel.marca.values[0]);
          }

          const response = await apiClient.get(`/api/v1/fichas?${params.toString()}`);
          
          rowParams.successCallback(response.rows, response.lastRow);
          
        } catch (error) {
          console.error("Error fetching grid details", error);
          rowParams.failCallback();
        }
      }
    };
    
    params.api.setGridOption('datasource', dataSource);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background p-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text">Catálogo de Fichas (AG Grid)</h2>
        <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded font-medium shadow-soft">
                Marcar como revisado
            </button>
            <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded font-medium shadow-soft">
                Exportar subset CSV
            </button>
        </div>
      </div>
      
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <Grid onGridReady={onGridReady} />
      </div>

      <div className="h-8 flex items-center justify-between text-xs text-gray-500 mt-2 px-2">
          <span>Vista de registros infinitos - Modo Server-side (Community Infinite)</span>
      </div>
    </div>
  );
}
