require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Rota para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint para gerar PIX
app.post('/gerar-pix', async (req, res) => {
  try {
    const { nome, cpf, telefone, valor } = req.body;
    
    // Validações básicas
    if (!nome || !cpf || !valor) {
      return res.status(400).json({ 
        erro: 'Dados obrigatórios: nome, cpf e valor' 
      });
    }

    // Preparar payload para a API do PayEvo
    const payload = {
      companyId: process.env.COMPANY_ID,
      type: 'PIX',
      value: parseFloat(valor.toString().replace(',', '.')),
      name: nome,
      cpfCnpj: cpf.replace(/\D/g, ''),
      description: `Pagamento PIX - ${nome}`,
      callbackUrl: `${req.protocol}://${req.get('host')}/webhook`
    };

    // Preparar autenticação
    const auth = Buffer.from(`${process.env.SECRET_KEY}:x`).toString('base64');

    console.log('Enviando para PayEvo:', JSON.stringify(payload, null, 2));

    // Fazer requisição para a API do PayEvo
    const response = await axios.post(
      'https://api.payevo.com.br/functions/v1/transactions', 
      payload, 
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('Resposta da PayEvo:', response.data);

    // Responder com os dados do PIX
    res.json({
      success: true,
      transactionId: response.data.id,
      qrCode: response.data.qrCode,
      qrCodeImage: response.data.qrCodeImage,
      value: response.data.value,
      status: response.data.status,
      expiresAt: response.data.expiresAt
    });

  } catch (error) {
    console.error('Erro ao gerar PIX:', error.response?.data || error.message);
    
    const errorMessage = error.response?.data?.message || error.message || 'Erro interno do servidor';
    const statusCode = error.response?.status || 500;
    
    res.status(statusCode).json({ 
      erro: 'Falha ao gerar PIX',
      detalhes: errorMessage,
      codigo: statusCode
    });
  }
});

// Endpoint para webhook
app.post('/webhook', (req, res) => {
  console.log('Webhook recebido:', req.body);
  res.status(200).json({ received: true });
});

// Endpoint para consultar status da transação
app.get('/consultar/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const auth = Buffer.from(`${process.env.SECRET_KEY}:x`).toString('base64');

    const response = await axios.get(
      `https://api.payevo.com.br/functions/v1/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Erro ao consultar transação:', error.response?.data || error.message);
    res.status(500).json({ erro: 'Falha ao consultar transação' });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Checkout PIX rodando em http://localhost:${PORT}`);
  console.log(`🌍 Variáveis de ambiente carregadas: ${process.env.COMPANY_ID ? '✅' : '❌'}`);
});
