import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with ample capacity for camera photos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Safe lazy initializer for Gemini API client
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API endpoint for converting handwritten schoolwork/notes photos to digital text
  app.post('/api/gemini/ocr-handwriting', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Nenhuma imagem foi recebida.' });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error:
            'A chave GEMINI_API_KEY não está configurada no servidor. Por favor verifica as definições de ambiente.',
        });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const cleanMime = mimeType || 'image/jpeg';

      const prompt = `És um assistente pedagógico e de estudo para alunos em Portugal.
Analisa a imagem fornecida, que contém texto manuscrito de um caderno escolar, folha de apontamentos, ficha de trabalho ou anotações do quadro (como no exemplo: "PAG. 30 Português", "PAG. 40 GEOGRAFIA", "Pag. 10 Inglês").

A tua missão é:
1. Ler com o máximo de precisão toda a caligrafia manual e transcrevê-la integralmente para texto digital legível.
2. Identificar e estruturar os dados para a criação de tarefas escolares / TPC:
   - transcription: Transcrição fiel e integral de todo o texto manuscrito legível visível na imagem.
   - title: Título conciso e informativo para a tarefa (ex.: "TPC Português, Geografia e Inglês" ou "Pág. 30 Português").
   - subjectCode: Código da disciplina escolar mais adequada (MAT, PORT, ING, CN, FQ, HIST, GEO, EF, EV, TIC, EMRC). Se houver várias disciplinas anotadas na folha, seleciona a primeira ou a principal.
   - type: Tipo de tarefa ("tpc", "trabalho" ou "teste"). Na dúvida, escolhe "tpc".
   - dueDate: Data de entrega sugerida no formato YYYY-MM-DD se detetada no texto (ex: se mencionar uma data ou dia da semana), senão string vazia "".
   - description: Descrição organizada em tópicos limpos com todas as páginas, matérias, questões e exercícios a resolver transcritos da folha.`;

      // Models to try in order: gemini-3.1-flash-lite (fast & robust), then fallback to gemini-3.8-flash / gemini-flash-latest
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let lastError: any = null;
      let response: any = null;

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: cleanBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  transcription: {
                    type: Type.STRING,
                    description: 'Transcrição digital integral do texto manuscrito.',
                  },
                  title: {
                    type: Type.STRING,
                    description: 'Título curto sugerido para a tarefa.',
                  },
                  subjectCode: {
                    type: Type.STRING,
                    description: 'Código da disciplina (MAT, PORT, ING, CN, FQ, HIST, GEO, EF, EV, TIC, EMRC).',
                  },
                  type: {
                    type: Type.STRING,
                    description: 'Tipo de tarefa: "tpc", "trabalho" ou "teste".',
                  },
                  dueDate: {
                    type: Type.STRING,
                    description: 'Data de entrega YYYY-MM-DD se detetada, senão string vazia.',
                  },
                  description: {
                    type: Type.STRING,
                    description: 'Instruções e exercícios transcritos de forma limpa e estruturada.',
                  },
                },
                required: ['transcription', 'title', 'subjectCode', 'type', 'description'],
              },
            },
          });
          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Tentativa com ${modelName} falhou:`, err?.message || err);
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error('Não foi possível obter resposta dos modelos de IA.');
      }

      const responseText = response.text || '{}';
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        parsedData = {
          transcription: responseText,
          title: 'Trabalho / TPC Digitalizado',
          subjectCode: 'MAT',
          type: 'tpc',
          dueDate: '',
          description: responseText,
        };
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error('Erro no OCR com Gemini:', err);
      let userFriendlyMessage = 'Falha ao processar a fotografia com o Gemini.';
      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed?.error?.message) {
            userFriendlyMessage = parsed.error.message;
          } else {
            userFriendlyMessage = err.message;
          }
        } catch {
          userFriendlyMessage = err.message;
        }
      }
      return res.status(500).json({
        error: userFriendlyMessage,
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Zona de Treino API' });
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
