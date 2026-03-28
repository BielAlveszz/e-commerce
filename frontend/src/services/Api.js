export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
export const WHATSAPP_NUMBER = process.env.REACT_APP_WHATSAPP_NUMBER || '';

// Wrapper de fetch que sempre inclui credentials (para os cookies httpOnly funcionarem)
// e centraliza o tratamento de erros de autenticação
export const apiFetch = async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: 'include',   // envia o cookie httpOnly automaticamente
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    return response;
};