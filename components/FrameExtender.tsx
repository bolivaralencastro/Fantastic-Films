/// <reference lib="dom" />
import React, { useState } from 'react';
import { Sparkles, ArrowRight, ImagePlus, AlertCircle } from 'lucide-react';

// Removemos o import estático do @google/genai para evitar travar o app se a lib falhar ao carregar
// import { GoogleGenAI } from "@google/genai";

interface FrameExtenderProps {
  sourceFrame: string; // Base64 string
}

export const FrameExtender: React.FC<FrameExtenderProps> = ({ sourceFrame }) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Importação dinâmica: carrega a biblioteca apenas quando necessário
      // Isso protege o carregamento inicial do App
      const { GoogleGenAI } = await import("@google/genai");

      // Tenta obter a chave do process.env (injetado ou shimmed)
      const apiKey = process.env.API_KEY;
      
      if (!apiKey) {
        throw new Error("API Key não encontrada. Verifique se a variável de ambiente está configurada.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Clean base64 string (remove data:image/png;base64, prefix)
      const base64Data = sourceFrame.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data
              }
            },
            {
              text: `Você é um especialista em continuidade de vídeo e cinematografia.
              
              TAREFA:
              A imagem fornecida é o ÚLTIMO FRAME de um vídeo de 6 segundos.
              Sua missão é gerar uma imagem realista que represente o frame final dos PRÓXIMOS 6 segundos de vídeo.
              
              CONTEXTO/AÇÃO PARA OS PRÓXIMOS 6 SEGUNDOS:
              "${prompt}"
              
              DIRETRIZES TÉCNICAS:
              1. Mantenha exatamente o mesmo estilo visual, granulação, iluminação e paleta de cores da imagem original.
              2. Mantenha a mesma proporção (aspect ratio).
              3. A evolução da cena deve ser física e logicamente coerente com o prompt fornecido.
              4. O resultado deve parecer uma captura de tela de vídeo, não uma ilustração artística.`
            }
          ]
        }
      });

      // Extract image from response
      let foundImage = false;
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const imgUrl = `data:image/png;base64,${part.inlineData.data}`;
                setGeneratedImage(imgUrl);
                foundImage = true;
                break;
            }
        }
      }
      
      if (!foundImage) {
          throw new Error("O modelo não retornou uma imagem válida. Tente reformular o prompt.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao gerar a imagem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-800/50 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-slate-300">
          Imaginar Continuação (+6s)
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Area */}
        <div className="space-y-3">
            <div className="relative group">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="O que acontece nos próximos 6 segundos? (ex: A câmera faz um zoom out revelando uma cidade futurista...)"
                    className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none placeholder:text-slate-600 transition-all hover:bg-slate-900"
                />
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className={`
                    w-full py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2
                    ${isLoading || !prompt.trim()
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                    }
                `}
            >
                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Sparkles className="w-4 h-4" />
                )}
                Gerar Frame Futuro
            </button>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}
        </div>

        {/* Result Area */}
        <div className={`
            relative rounded-lg overflow-hidden bg-slate-900 border border-dashed border-slate-800 aspect-video flex items-center justify-center group
            ${generatedImage ? 'border-solid border-purple-500/30' : ''}
        `}>
            {generatedImage ? (
                <>
                    <img 
                        src={generatedImage} 
                        alt="AI Generated Frame" 
                        className="w-full h-full object-contain animate-fade-in"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a 
                            href={generatedImage}
                            download="frame-continuacao-ai.png"
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-transform hover:scale-110"
                            title="Baixar imagem"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                </>
            ) : (
                <div className="text-center p-4 text-slate-600">
                    <ImagePlus className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">O frame gerado aparecerá aqui</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};