import React from 'react';
import { X, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: queryKeys.notificaciones,
    queryFn: () => apiClient.get('/api/v1/notificaciones'),
    enabled: isOpen,
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) => apiClient.put(`/api/v1/notificaciones/${id}/leer`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones });
    }
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 z-40" onClick={onClose} />
      
      {/* Drawer absolute right */}
      <aside className="absolute right-0 top-0 bottom-0 w-[400px] bg-white border-l border-gray-200 z-50 flex flex-col shadow-xl transform transition-transform duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-text">Notificaciones</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Cargando...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No hay notificaciones recientes</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {notifications.map((notif: any) => (
                <li 
                  key={notif.id} 
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notif.leida ? 'bg-primary/5' : ''}`}
                  onClick={() => !notif.leida && markAsRead.mutate(notif.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 flex-shrink-0">
                      {notif.tipo === 'reporte_semanal' ? <CheckCircle className="w-5 h-5 text-green-500" /> : 
                       notif.tipo === 'alerta_sistema' ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
                       <Info className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notif.leida ? 'font-semibold text-text' : 'font-medium text-gray-700'}`}>
                          {notif.titulo}
                        </p>
                        {!notif.leida && <span className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notif.cuerpo}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
