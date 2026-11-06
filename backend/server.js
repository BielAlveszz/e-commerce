const app = require('./src/app');
const logger = require('./src/utils/logger');
const port = process.env.PORT || 3001;

app.listen(port, () => {
  logger.info(`Servidor backend da Meby Cosméticos rodando na porta ${port}`);
});