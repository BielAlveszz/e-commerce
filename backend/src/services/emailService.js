const nodemailer = require('nodemailer');

const criarTransporter = () => {
  const provider = process.env.EMAIL_PROVIDER || 'gmail';

  if (provider === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
    });
  }

  if (provider === 'outlook') {
    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  // Gmail padrão — use Senha de App
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
};

const enviarEmailResetSenha = async (destinatario, nomeCliente, linkReset) => {
  const transporter = criarTransporter();

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#faf8f6;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f6;padding:40px 16px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="max-width:520px;background:#fff;border-radius:12px;border:1px solid #f5e6e1;overflow:hidden;">
            <tr>
              <td style="background:#c9a8a0;padding:28px 32px;text-align:center;">
                <h1 style="margin:0;font-size:26px;color:#fff;font-family:Georgia,serif;letter-spacing:1px;">
                  Meby Cosméticos
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;">
                <h2 style="margin:0 0 12px;font-size:20px;color:#5a4a45;">Redefinição de senha</h2>
                <p style="margin:0 0 8px;color:#7a6a65;font-size:15px;line-height:1.6;">
                  Olá, <strong>${nomeCliente}</strong>!
                </p>
                <p style="margin:0 0 24px;color:#7a6a65;font-size:15px;line-height:1.6;">
                  Recebemos uma solicitação para redefinir a senha da sua conta.
                  Clique no botão abaixo para criar uma nova senha:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center">
                    <a href="${linkReset}"
                       style="display:inline-block;background:#c9a8a0;color:#fff;font-weight:600;
                              font-size:15px;text-decoration:none;padding:14px 36px;border-radius:8px;">
                      Redefinir minha senha
                    </a>
                  </td></tr>
                </table>
                <p style="margin:28px 0 8px;color:#aaa;font-size:13px;line-height:1.6;">
                  Este link expira em <strong>1 hora</strong>.
                </p>
                <p style="margin:0;color:#aaa;font-size:13px;line-height:1.6;">
                  Se você não solicitou a redefinição, ignore este email. Sua senha permanece a mesma.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#faf8f6;border-top:1px solid #f5e6e1;text-align:center;">
                <p style="margin:0;color:#bbb;font-size:12px;">
                  Meby Cosméticos · Email automático, não responda.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from:    `"Meby Cosméticos" <${process.env.EMAIL_USER}>`,
    to:      destinatario,
    subject: 'Redefinição de senha — Meby Cosméticos',
    html,
  });
};

module.exports = { enviarEmailResetSenha };