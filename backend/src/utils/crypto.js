const crypto = require('crypto');

// A chave deve ter exatamente 32 caracteres para o AES-256.
// Recomenda-se colocar isto no ficheiro .env como ENCRYPTION_KEY=sua_chave_de_32_caracteres_aqui
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'chave-secreta-provisoria-32-cars';
const IV_LENGTH = 16; 

const encrypt = (text) => {
    if (!text) return text;
    // O IV (Initialization Vector) garante que o mesmo CPF gere hashes diferentes
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Guardamos o IV junto com o dado para podermos reverter depois
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
    if (!text) return text;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Erro ao desencriptar o dado:', error);
        return null;
    }
};

module.exports = { encrypt, decrypt };