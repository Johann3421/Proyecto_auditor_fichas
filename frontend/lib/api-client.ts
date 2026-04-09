// Client para conectar con el backend de Go
// En producción, usamos rutas relativas para que Traefik gestione el ruteo interno
// y evitar errores de Mixed Content (SSL) o CORS.
const isProd = process.env.NODE_ENV === 'production';
const baseUrl = isProd ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

async function fetchWithConfig(url: string, config: RequestInit) {
  // Aseguramos que la URL empiece con / si usamos baseUrl vacía
  const fullUrl = `${baseUrl}${url}`;
  
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
