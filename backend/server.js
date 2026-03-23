const app = require('./src/app');
const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Servidor backend da Meby Cosméticos rodando na porta ${port}`);
});