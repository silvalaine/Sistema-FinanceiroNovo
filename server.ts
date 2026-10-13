import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.post('/api/gemini/savings-tips', async (req, res) => {
  try {
    const { transactions, categories, cards } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Chave de API do Gemini não configurada no servidor.',
      });
    }

    const simplifiedTxs = (transactions || []).slice(0, 50).map((t: any) => ({
      descricao: t.description,
      valor: t.amount,
      tipo: t.type,
      data: t.date,
      forma_pagamento: t.paymentMethod,
      parcela: t.installment ? `${t.installment.current}/${t.installment.total}` : undefined,
    }));

    const simplifiedCategories = (categories || []).map((c: any) => ({
      nome: c.name,
      tipo: c.type,
      limite_orcamento: c.budgetLimit,
    }));

    const prompt = `Você é um consultor financeiro pessoal especialista em finanças brasileiras.
Analise as transações financeiras, despesas recorrentes, categorias e compras parceladas do usuário abaixo:

Transações recentes:
${JSON.stringify(simplifiedTxs, null, 2)}

Categorias de despesas e orçamentos:
${JSON.stringify(simplifiedCategories, null, 2)}

Cartões cadastrados:
${JSON.stringify(cards || [], null, 2)}

Identifique hábitos de consumo, custos fixos altos, despesas por impulso, compras parceladas acumuladas e serviços recorrentes.
Gere EXATAMENTE 3 recomendações de economia personalizadas, realistas e acionáveis para o usuário.

Cada recomendação deve conter:
- title: Título curto e chamativo da dica (máx 6 palavras, em português)
- category: A categoria relacionada (ex: Alimentação, Moradia, Streaming & Lazer, Cartão de Crédito)
- tip: Explicação clara de 2 a 3 frases com a ação concreta a tomar
- potentialSavings: Estimativa de economia em R$ (ex: "R$ 180/mês", "R$ 350/mês", "Até R$ 1.200/ano")`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Lista de 3 dicas de economia personalizadas',
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              tip: { type: Type.STRING },
              potentialSavings: { type: Type.STRING },
            },
            required: ['title', 'category', 'tip', 'potentialSavings'],
          },
        },
      },
    });

    const tips = JSON.parse(response.text || '[]');
    return res.json({ tips });
  } catch (error: any) {
    console.error('Error generating savings tips with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Falha ao gerar dicas de economia com a IA.',
    });
  }
});

// Mount Vite in development or serve static build in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
