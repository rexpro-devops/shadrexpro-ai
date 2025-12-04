
import { GoogleGenAI, GenerateContentResponse, Type, Modality, Content, Part, GenerateContentParameters, Tool, GenerateContentStreamResponse } from "@google/genai";
import { Attachment, ChatMessage, Model, Role } from "../types";
import { useAppStore } from "../store";

const getAiClient = (): GoogleGenAI => {
    const state = useAppStore.getState();
    const currentApiKey = state.userApiKey || process.env.API_KEY;

    if (!currentApiKey) {
        throw new Error("API_KEY not set. Please configure it in settings.");
    }
    
    // Always create a new client to ensure the latest API key is used, especially after modal selection.
    return new GoogleGenAI({ apiKey: currentApiKey });
};

// --- Existing Service Functions (Adapted & Completed) ---

export const dataUrlToPart = (attachment: Attachment): Part => {
  const [mimeTypePrefix, base64] = attachment.dataUrl.split(',');
  const mimeType = mimeTypePrefix.split(':')[1].split(';')[0];
  return {
    inlineData: {
      mimeType,
      data: base64,
    },
  };
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    const ai = getAiClient();
    const audioPart = { inlineData: { data: base64Audio, mimeType } };
    const textPart = { text: "Transcribe this audio. If there is no speech, return an empty string." };
    const response = await ai.models.generateContent({
        model: Model.GEMINI_2_5_FLASH,
        contents: { parts: [audioPart, textPart] },
    });
    return response.text;
};

export const extractTextFromFile = async (file: { dataUrl: string, mimeType: string }): Promise<string> => {
    const ai = getAiClient();
    const part = {
        inlineData: {
            data: file.dataUrl.split(',')[1],
            mimeType: file.mimeType
        }
    };
    const textPart = { text: "Extract the text content from this file. For audio, transcribe it, otherwise just extract all text. If it is an image, describe it." };
    
    try {
        const response = await ai.models.generateContent({
            model: Model.GEMINI_2_5_FLASH,
            contents: { parts: [part, textPart] },
        });
        return response.text;
    } catch (error) {
        console.error("Error extracting text:", error);
        return "Failed to extract text from the file.";
    }
};

interface GenerateStreamParams {
    prompt: string;
    attachments: Attachment[];
    history: ChatMessage[];
    model: string;
    systemInstruction: string;
    temperature: number;
    maxOutputTokens?: number;
    topP: number;
    topK: number;
    useGoogleSearch: boolean;
    useCodeExecution: boolean;
    useThinking: boolean;
    useThinkingBudget: boolean;
    thinkingBudget: number;
    isProModel: boolean;
    responseSchema?: any;
    signal: AbortSignal;
}

export const generateResponseStream = async (params: GenerateStreamParams): Promise<GenerateContentStreamResponse> => {
    const ai = getAiClient();

    const contents: Content[] = params.history
        .filter(msg => msg.role === Role.USER || msg.role === Role.MODEL)
        .map(msg => ({
            role: msg.role === Role.USER ? 'user' : 'model',
            parts: msg.parts,
        }));

    const userParts: Part[] = [{ text: params.prompt }];
    params.attachments.forEach(att => userParts.push(dataUrlToPart(att)));
    contents.push({ role: 'user', parts: userParts });

    const generationConfig: any = {
        temperature: params.temperature,
        topP: params.topP,
        topK: params.topK,
    };
    if (params.maxOutputTokens && params.maxOutputTokens > 0) {
        generationConfig.maxOutputTokens = params.maxOutputTokens;
    }

    const tools: Tool[] = [];
    if (params.useGoogleSearch) {
        tools.push({ googleSearch: {} });
    }
    if (params.useCodeExecution) {
        tools.push({
            functionDeclarations: [{
                name: 'codeExecution',
                description: 'Executes the given Python code in a secure environment.',
                parameters: { type: Type.OBJECT, properties: { code: { type: Type.STRING, description: "The Python code to execute." } }, required: ["code"] }
            }]
        });
    }

    let effectiveModel = params.model;
    
    const request: any = {
        model: effectiveModel,
        contents: contents,
        config: {
            ...generationConfig
        },
    };

    if (params.systemInstruction) {
        request.config.systemInstruction = params.systemInstruction;
    }

    if (tools.length > 0) {
        request.config.tools = tools;
    }

    if (params.responseSchema && Object.keys(params.responseSchema).length > 0) {
        request.config.responseMimeType = "application/json";
        request.config.responseSchema = params.responseSchema;
    }

    const isGemmaModel = effectiveModel.startsWith('gemma');
    const isGemini3 = effectiveModel.includes('gemini-3');
    // Gemini 2.5 models that support thinking (Text, Lite, Pro, Live).
    // Explicitly exclude gemini-2.5-flash-image as it does not support thinking.
    const isGemini2_5Thinking = effectiveModel.includes('gemini-2.5') && !effectiveModel.includes('flash-image');

    if (!isGemmaModel) {
        if (isGemini3) {
             // Gemini 3 models work differently: they always think.
             // Budget 0 is invalid.
             request.config.thinkingConfig = {};
             
             if (params.useThinking) {
                  // User specifically enabled thinking toggle.
                  request.config.thinkingConfig.includeThoughts = true;
                  if (params.useThinkingBudget) {
                       // Backward compatibility: use budget if provided.
                       request.config.thinkingConfig.thinkingBudget = params.thinkingBudget;
                  }
                  // If no budget set, it defaults to HIGH (dynamic) automatically.
             } else {
                  // User has "Thinking" toggled OFF. 
                  // For Gemini 3, we cannot turn it off completely (budget 0).
                  // The doc recommends "thinking_level: 'low'" for lower latency/cost.
                  // We cast to any to bypass potential TS strictness if types aren't updated yet.
                  (request.config.thinkingConfig as any).thinkingLevel = "LOW";
             }
        } else if (isGemini2_5Thinking) {
            // Logic for Gemini 2.5 (Pro, Flash, Flash-Lite)
            if (params.useThinking || params.isProModel) {
                request.config.thinkingConfig = { includeThoughts: true };
                if (params.useThinkingBudget) {
                    request.config.thinkingConfig.thinkingBudget = params.thinkingBudget;
                }
            } else {
                // For non-Gemini-3 models, budget 0 disables thinking.
                request.config.thinkingConfig = { thinkingBudget: 0 };
            }
        }
        // For other models (Gemini 2.0, etc.), do NOT send thinkingConfig to avoid 400 errors.
    }


    return await ai.models.generateContentStream(request);
};

export const generateImage = async (params: { prompt: string, model: Model, numberOfImages: number, aspectRatio: string, negativePrompt: string, seed?: number, signal: AbortSignal }) => {
    const ai = getAiClient();
    return ai.models.generateImages({
        model: params.model,
        prompt: params.prompt,
        config: {
            numberOfImages: params.numberOfImages,
            aspectRatio: params.aspectRatio,
            negativePrompt: params.negativePrompt || undefined,
            seed: params.seed,
            outputMimeType: 'image/png',
        },
    });
};

export const generateVideo = async (params: { prompt: string, model: Model, imageAttachment?: Attachment, signal: AbortSignal }): Promise<Attachment> => {
    const ai = getAiClient();

    let operation = await ai.models.generateVideos({
        model: params.model,
        prompt: params.prompt,
        ...(params.imageAttachment && {
            image: {
                imageBytes: params.imageAttachment.dataUrl.split(',')[1],
                mimeType: params.imageAttachment.mimeType
            }
        }),
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });

    while (!operation.done) {
        if (params.signal.aborted) throw new Error('Aborted by user.');
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error'}`);
    }

    const videoInfo = operation.response?.generatedVideos?.[0]?.video;

    if (!videoInfo?.uri) {
        throw new Error("Video generation failed or returned no URI.");
    }
    
    const downloadLink = videoInfo.uri;
    const response = await fetch(`${downloadLink}&key=${useAppStore.getState().userApiKey || process.env.API_KEY}`);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve({
                name: `generated_video_${Date.now()}.mp4`,
                mimeType: 'video/mp4',
                dataUrl: reader.result as string
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
