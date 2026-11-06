export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '';

// Wrapper de fetch que sempre inclui credentials (para os cookies httpOnly funcionarem)
// e centraliza o tratamento de cabeçalhos.
export const apiFetch = async (path, options = {}) => {
    const isFormData = options.body instanceof FormData;

    const headers = { ...options.headers };

    // IMPORTANTE: quando o corpo é FormData (ex.: upload de imagem), NÃO definimos
    // o Content-Type manualmente — o browser gera "multipart/form-data" com o
    // boundary correto. Definir "application/json" aqui quebra o upload.
    if (!isFormData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: 'include',   // envia o cookie httpOnly automaticamente
        headers,
    });
    return response;
};