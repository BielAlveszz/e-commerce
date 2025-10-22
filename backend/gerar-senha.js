const bcrypt = require('bcryptjs');

// 1. Defina sua nova senha aqui dentro das aspas
const novaSenha = '123456'; 

// O resto do código faz a mágica da criptografia
console.log(`Gerando hash para a senha: "${novaSenha}"`);
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(novaSenha, salt);

console.log('\nCriptografia gerada com sucesso!');
console.log('Copie a linha abaixo e cole no seu comando SQL:\n');
console.log(hash);