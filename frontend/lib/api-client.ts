// Client para conectar con el backend de Go
// En producción, usamos rutas relativas para que Traefik gestione el ruteo interno
// y evitar errores de Mixed Content (SSL) o CORS.

async function fetchWithConfig(url: string, config: RequestInit) {
  // Cuando Next.js (SSR) pide datos en el servidor, usamos el nombre del contenedor de docker
  // Cuando se ejecuta en el cliente (Browser), usamos una url relativa para que lo rutee Traefik
  const isBrowser = typeof window !== 'undefined';
  const backendInternalUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8080';
  const fullUrl = isBrowser ? url : `${backendInternalUrl}${url}`;
  
  const response = await fetch(fullUrl, {
    ...config,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const apiClient = {
  get: (url: string, config?: RequestInit) => fetchWithConfig(url, { ...config, method: 'GET' }),
  post: (url: string, body: any, config?: RequestInit) => fetchWithConfig(url, { ...config, method: 'POST', body: JSON.stringify(body) }),
  put: (url: string, body: any, config?: RequestInit) => fetchWithConfig(url, { ...config, method: 'PUT', body: JSON.stringify(body) }),
  delete: (url: string, config?: RequestInit) => fetchWithConfig(url, { ...config, method: 'DELETE' }),
};
