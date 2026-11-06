const DashboardModel = require('../models/dashboardModel');
const logger = require('../utils/logger'); // Importando o nosso logger de erros

// ─────────────────────────────────────────────────────────────────
// CACHE EM MEMÓRIA PARA O DASHBOARD (Válido por 5 minutos)
// ─────────────────────────────────────────────────────────────────
let dashboardCache = {
    data: null,
    timestamp: 0
};
const TEMPO_CACHE = 5 * 60 * 1000; // 5 minutos em milissegundos

const getDashboardStats = async (req, res) => {
    try {
        const agora = Date.now();
        
        // 1. Verifica se o cache existe e se ainda não se passaram 5 minutos
        if (dashboardCache.data && (agora - dashboardCache.timestamp < TEMPO_CACHE)) {
            return res.json(dashboardCache.data);
        }

        // 2. Se não houver cache (ou se expirou), faz as queries pesadas no banco de dados
        const stats = await DashboardModel.getStats();

        // 3. Salva o resultado no cache com a hora atual para as próximas requisições
        dashboardCache = {
            data: stats,
            timestamp: agora
        };

        res.json(stats);
    } catch (error) {
        // 4. Registrando o erro no arquivo de log seguro em vez do console.error solto
        logger.error("Erro ao buscar estatísticas do dashboard:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar estatísticas." });
    }
};

// Utilidade: Permite limpar o cache manualmente se você precisar usar em outras partes do sistema
const limparCacheDashboard = () => {
    dashboardCache.timestamp = 0;
};

module.exports = {
    getDashboardStats,
    limparCacheDashboard,
};