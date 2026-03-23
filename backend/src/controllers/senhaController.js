const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const db      = require('../database');
const { enviarEmailResetSenha } = require('../services/emailService');

// POST /api/clientes/solicitar-reset
// Recebe o email, gera token e envia o email com o link
const solicitarReset = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email é obrigatório.' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, nome FROM clientes WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Resposta genérica — não revela se o email existe ou não (segurança)
    const respostaGenerica = {
      message: 'Se este email estiver cadastrado, você receberá as instruções em breve.'
    };

    if (rows.length === 0) {
      return res.json(respostaGenerica);
    }

    const cliente = rows[0];

    // Gera token seguro e define expiração de 1 hora
    const token   = crypto.randomBytes(32).toString('hex');
    const expira  = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await db.query(
      'UPDATE clientes SET reset_token = $1, reset_token_expira = $2 WHERE id = $3',
      [token, expira, cliente.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const linkReset   = `${frontendUrl}/redefinir-senha?token=${token}`;

    await enviarEmailResetSenha(email, cliente.nome, linkReset);

    return res.json(respostaGenerica);
  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    // Não expõe detalhes do erro ao cliente
    res.status(500).json({ message: 'Erro ao processar solicitação. Tente novamente.' });
  }
};

// POST /api/clientes/resetar-senha
// Recebe o token e a nova senha, valida e atualiza
const resetarSenha = async (req, res) => {
  const { token, novaSenha } = req.body;

  if (!token || !novaSenha) {
    return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
  }

  // Valida força da senha (igual ao registro)
  const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!senhaRegex.test(novaSenha)) {
    return res.status(400).json({
      message: 'A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.'
    });
  }

  try {
    const { rows } = await db.query(
      `SELECT id FROM clientes
       WHERE reset_token = $1
         AND reset_token_expira > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: 'Link inválido ou expirado. Solicite um novo link de redefinição.'
      });
    }

    const clienteId = rows[0].id;

    // Atualiza a senha e invalida o token
    const salt    = await bcrypt.genSalt(12);
    const hash    = await bcrypt.hash(novaSenha, salt);

    await db.query(
      `UPDATE clientes
       SET senha_hash = $1, reset_token = NULL, reset_token_expira = NULL
       WHERE id = $2`,
      [hash, clienteId]
    );

    res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer o login.' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ message: 'Erro ao redefinir senha. Tente novamente.' });
  }
};

module.exports = { solicitarReset, resetarSenha };