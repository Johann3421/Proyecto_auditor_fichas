// Fetch wrapper para FastAPI
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWithConfig(url: string, config: RequestInit) {
  const response = await fetch(`${baseUrl}${url}`, {
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
