const DashboardModel = require('../models/dashboardModel');

const getDashboardStats = async (req, res) => {
    try {
        const stats = await DashboardModel.getStats();
        res.json(stats);
    } catch (error) {
        console.error("Erro ao buscar estatísticas do dashboard:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar estatísticas." });
    }
};

module.exports = {
    getDashboardStats,
};