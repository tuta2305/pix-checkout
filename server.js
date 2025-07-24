require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('.')); // Serve index.html e assets
app.use(express.json());

app.post('/gerar-pix', async (req, res) => {
  const { nome, cpf, valor } = req.body;
  const payload = {
    companyId: process.env.COMPANY_ID,
    type: 'PIX',
    value: parseFloat(valor),
    name: nome,
    cpfCnpj: cpf,
    description: 'Pagamento via Pix',
    callbackUrl: 'https://seudominio.com/webhook'
  };

  const auth = Buffer.from(`${process.env.SECRET_KEY}:x`).toString('base64');

  try {
    const response = await axios.post('https://api.payevo.com.br/functions/v1/transactions', payload, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Erro ao gerar Pix:', err.response?.data || err.message);
    res.status(500).json({ erro: 'Falha ao gerar Pix' });
  }
});

app.listen(3000, () => console.log('🔥 Checkout Pix rodando em http://localhost:3000'));
