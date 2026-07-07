export const API_BASE_URL = localStorage.getItem('api_base_url') || 'http://localhost:8000';

export const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s.`);
    }
    throw new Error(`Network connection failed. Ensure backend server is running and accessible.`);
  }
};
