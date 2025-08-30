/**
 * Adiciona o ID, tamanho e valor de um campo no payload do PIX.
 * @param {string} id O ID do campo (ex: '00', '26').
 * @param {string} value O valor do campo.
 * @returns {string} O campo formatado.
 */
function formatField(id, value) {
  const size = String(value.length).padStart(2, '0');
  return `${id}${size}${value}`;
}

/**
 * Gera um payload PIX no formato BR Code.
 * @param {object} options As opções para o PIX.
 * @param {string} options.pixKey A chave PIX do recebedor (CPF, CNPJ, Email, etc.).
 * @param {string} options.merchantName O nome do recebedor (máx 25 caracteres).
 * @param {string} options.merchantCity A cidade do recebedor (máx 15 caracteres).
 * @param {string} [options.txid='***'] O ID da transação (alfanumérico, máx 25 caracteres).
 * @param {number} [options.amount] O valor da transação.
 * @returns {string} O payload completo do PIX "Copia e Cola".
 */
function generatePixPayload({ pixKey, merchantName, merchantCity, txid = '***', amount }) {
  // Remove acentos e caracteres especiais do nome e da cidade, e limita o tamanho.
  const sanitizedMerchantName = merchantName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
  const sanitizedMerchantCity = merchantCity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 15);

  const payload = [
    formatField('00', '01'), // Payload Format Indicator
    formatField('26', 
        formatField('00', 'br.gov.bcb.pix') + 
        formatField('01', pixKey)
    ), // Merchant Account Information
    formatField('52', '0000'), // Merchant Category Code (obrigatório, '0000' para não especificado)
    formatField('53', '986'), // Transaction Currency (986 = BRL)
    formatField('54', amount.toFixed(2)), // Transaction Amount
    formatField('58', 'BR'), // Country Code
    formatField('59', sanitizedMerchantName), // Merchant Name
    formatField('60', sanitizedMerchantCity), // Merchant City
    formatField('62', formatField('05', txid)), // Additional Data (txid)
  ].join('');

  const payloadWithCrcField = payload + '6304'; // Adiciona o campo do CRC16

  // --- Cálculo do CRC16 ---
  let crc = 0xFFFF;
  for (let i = 0; i < payloadWithCrcField.length; i++) {
    crc ^= (payloadWithCrcField.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  const crc16 = ('0000' + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
  
  return payloadWithCrcField + crc16;
}

module.exports = { generatePixPayload };