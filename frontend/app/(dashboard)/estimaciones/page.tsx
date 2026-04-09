"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/Button';

export default function EstimacionesPage() {
  const queryClient = useQueryClient();
  const [editingMarca, setEditingMarca] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const { data: estimaciones = [], isLoading } = useQuery({
    queryKey: queryKeys.estimaciones,
    queryFn: () => apiClient.get('/api/v1/estimaciones'),
  });

  const updateMutation = useMutation({
    mutationFn: (args: { marca: string, payload: any }) => apiClient.put(`/api/v1/estimaciones/${args.marca}`, args.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estimaciones });
      setEditingMarca(null);
    }
  });

  const handleEditClick = (est: any) => {
    setEditingMarca(est.marca);
    setEditValues({
      precio_base: est.precio_base || '',
      precio_min: est.precio_min || '',
      precio_max: est.precio_max || '',
      fuente: est.fuente || ''
    });
  };

  const handleSave = (marca: string) => {
    updateMutation.mutate({ marca, payload: editValues });
  };

  if (isLoading) return <div className="p-6 text-gray-500">Cargando estimaciones...</div>;

  return (
    <div className="p-6 bg-background h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-xl font-semibold text-text">Estimaciones de Mercado</h2>
            <p className="text-sm text-gray-500 mt-1">Configura las bandas de precios esperados por marca para auditoría cruzada.</p>
        </div>
        <Button>+ Agregar Marca</Button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm text-text">
          <thead className="bg-[#f8f9fc] border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Precio Base (S/.)</th>
              <th className="px-4 py-3 font-medium">Precio Mín. (S/.)</th>
              <th className="px-4 py-3 font-medium">Precio Máx. (S/.)</th>
              <th className="px-4 py-3 font-medium">Fuente</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {estimaciones.map((est: any) => (
              <tr key={est.marca} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{est.marca}</td>
                
                {editingMarca === est.marca ? (
                  <>
                    <td className="px-4 py-2"><input type="number" className="border rounded px-2 py-1 w-24 text-sm" value={editValues.precio_base} onChange={e => setEditValues({...editValues, precio_base: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleSave(est.marca)} autoFocus/></td>
                    <td className="px-4 py-2"><input type="number" className="border rounded px-2 py-1 w-24 text-sm" value={editValues.precio_min} onChange={e => setEditValues({...editValues, precio_min: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleSave(est.marca)} /></td>
                    <td className="px-4 py-2"><input type="number" className="border rounded px-2 py-1 w-24 text-sm" value={editValues.precio_max} onChange={e => setEditValues({...editValues, precio_max: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleSave(est.marca)} /></td>
                    <td className="px-4 py-2"><input type="text" className="border rounded px-2 py-1 w-32 text-sm" value={editValues.fuente} onChange={e => setEditValues({...editValues, fuente: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleSave(est.marca)}/></td>
                    <td className="px-4 py-3 text-sm flex gap-2">
                        <button onClick={() => handleSave(est.marca)} className="text-primary font-medium hover:underline">Guardar</button>
                        <button onClick={() => setEditingMarca(null)} className="text-gray-500 font-medium hover:underline">Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">{est.precio_base ? `S/. ${est.precio_base}` : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{est.precio_min || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{est.precio_max || '-'}</td>
                    <td className="px-4 py-3">{est.fuente || '-'}</td>
                    <td className="px-4 py-3">
                        <button onClick={() => handleEditClick(est)} className="text-primary font-medium hover:underline">Editar</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {estimaciones.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay estimaciones registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
