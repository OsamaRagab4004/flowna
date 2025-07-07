// API Configuration utility
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return `${API_BASE_URL}/${cleanEndpoint}`
}

export const getWebSocketUrl = (): string => {
  return `${API_BASE_URL}/ws`
}

export { API_BASE_URL }
