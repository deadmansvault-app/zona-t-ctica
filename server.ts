import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }
    aiClient = new GoogleGenAI({});
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Zona de Treino API' });
  });

  // AI Task & Multi-Event Extraction Endpoint
  app.post('/api/ai/parse-tasks', async (req, res) => {
    try {
      const { text, defaultYear } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Texto obrigatório' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(200).json({ tasks: [], fallbackNeeded: true });
      }

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Analisa o seguinte texto de agenda escolar portuguesa (ex: Inovar, Teams, Classroom ou notas) e extrai TODOS os eventos, testes, trabalhos, TPCs ou outras tarefas. Se existirem múltiplas entradas/linhas, extrai cada uma como um evento individual separado.
Texto a analisar:
"""
${text}
"""`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Título claro do evento, ex: Teste de Físico-Química' },
                subjectCode: { type: Type.STRING, description: 'Código da disciplina: MAT, POR, FG, HIST, CN, GEO, ING, FRA, EF, EV, TIC, CD' },
                type: { type: Type.STRING, description: 'Tipo: teste, trabalho, tpc, ou outro' },
                dueDate: { type: Type.STRING, description: 'Data no formato YYYY-MM-DD' },
                dueTime: { type: Type.STRING, description: 'Hora de início no formato HH:mm se existir' },
                timeRange: { type: Type.STRING, description: 'Intervalo de tempo se existir, ex: 08:15 - 10:05 (2 tempos / 2h)' },
                teacher: { type: Type.STRING, description: 'Nome do docente se indicado' },
                isTwoHourBlock: { type: Type.BOOLEAN, description: 'Verdadeiro se for um teste de 2 horas ou 2 tempos unificados' },
                slotCount: { type: Type.INTEGER, description: 'Número de tempos (ex: 2)' },
                description: { type: Type.STRING, description: 'Notas ou texto original da entrada' },
              },
              required: ['title', 'subjectCode', 'type', 'dueDate'],
            },
          },
          systemInstruction: `És um assistente especializado em processamento de agendas e horários escolares em Portugal.
Ano letivo de referência: ${defaultYear || '2026/2027'}.

REGRA FUNDAMENTAL PARA TESTES DE 2 HORAS (2 TEMPOS CONSECUTIVOS):
Em Portugal, os testes sumativos ocupam frequentemente 2 tempos letivos consecutivos (ex: 08:15-09:05 e 09:15-10:05, ou 10:25-11:15 e 11:25-12:15) e surgem marcados em duas linhas separadas para a mesma disciplina no mesmo dia.
SEMPRE que detetares 2 entradas de teste para a MESMA disciplina na MESMA data (com horários consecutivos ou adjacentes):
- NUNCA cries 2 eventos separados!
- CRIA APENAS 1 ÚNICO EVENTO DE 2 HORAS.
- Define timeRange unificado (ex: '08:15 - 10:05 (2 tempos / 2h)'), dueTime como a hora de início do 1º bloco (ex: '08:15'), isTwoHourBlock: true, slotCount: 2.
- No título, identifica claramente ex: 'Teste de Físico-Química (2 tempos / 2h)'.

Para entradas com datas ou disciplinas diferentes, cria uma entrada para cada evento independente.
Códigos de disciplina:
- FG: Físico-Química (Sandra Lopes)
- MAT: Matemática (Cláudia Martinho)
- HIST: História (Alexandra Brito)
- CN: Ciências Naturais (Elvira Corceiro)
- POR: Português (Elsa Oliveira)
- GEO: Geografia (Margarida Dias)
- ING: Inglês (Ana Paula Dias)
- FRA: Francês (Anabela Romba)
- EF: Educação Física (Ana Vicente)
- EV: Educação Visual
- TIC: Tecnologias
- CD: Cidadania`,
        },
      });

      const parsedJson = JSON.parse(response.text || '[]');
      res.json({ tasks: parsedJson });
    } catch (err: any) {
      console.warn('Endpoint /api/ai/parse-tasks utilizou fallback local devido a:', err.message);
      res.status(200).json({ tasks: [], fallbackNeeded: true, message: err.message });
    }
  });

  // Vite middleware in dev; static file serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
