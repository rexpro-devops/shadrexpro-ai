
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Model,
  Role,
  ChatMessage,
  ChatSession,
  Attachment,
  Project,
  initialFiles,
  LiveConversationModel,
  MediaResolution,
  StreamingTarget,
  FileSystemNode,
  User,
} from './types';
import { generateResponseStream, generateImage, generateVideo } from './services/geminiService';
import * as localDb from './services/localDbService';
import * as authService from './services/authService';


// Helpers
const getActiveChat = (state: AppState) => state.chatHistory.find(c => c.id === state.activeChatId);

const updateActiveChat = (state: AppState, updater: (chat: ChatSession) => void): ChatSession[] => {
    return state.chatHistory.map(chat => {
        if (chat.id === state.activeChatId) {
            const newChat = { ...chat };
            updater(newChat);
            return newChat;
        }
        return chat;
    });
};

const findAndUpdateFile = (nodes: { [key: string]: FileSystemNode }, path: string, content: string): boolean => {
    const parts = path.split('/');
    let currentLevel = nodes;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;

        if (!currentLevel[part]) {
            if (isLastPart) {
                currentLevel[part] = { name: part, content };
            } else {
                currentLevel[part] = { name: part, children: {} };
            }
        }
        
        if (isLastPart) {
            if(currentLevel[part].children) return false; 
            currentLevel[part].content = content;
        } else {
            if (!currentLevel[part].children) {
                 return false;
            }
            currentLevel = currentLevel[part].children!;
        }
    }
    return true;
};

const createNewProject = (): Project => ({
    id: `proj_${Date.now()}`,
    name: 'New AI Project',
    description: 'A new coding project.',
    files: JSON.parse(JSON.stringify(initialFiles)),
});


const getPricing = (model: Model | string) => {
    // Prices are per token for input/output, and per item for images/videos.
    const prices: Record<string, { input: number; output: number; image?: number; video?: number }> = {
        // Gemini 3 Pro Preview - Placeholder, handled in _addUsage due to tiers
        [Model.GEMINI_3_PRO_PREVIEW]: { input: 0, output: 0 },
        
        // Gemini 2.5 Series
        [Model.GEMINI_2_5_PRO]: { input: 0, output: 0 }, // Handled separately in _addUsage
        [Model.GEMINI_2_5_FLASH]: { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 }, // Updated estimate based on Flash pricing trends
        [Model.GEMINI_2_5_FLASH_LITE]: { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
        
        // Gemini 2.0 Series
        [Model.GEMINI_2_0_FLASH]: { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
        [Model.GEMINI_2_0_FLASH_LITE]: { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
        
        // Image editing model
        [Model.GEMINI_3_PRO_IMAGE_PREVIEW]: { input: 0, output: 0, image: 0 },
        [Model.GEMINI_2_5_FLASH_IMAGE]: { input: 0, output: 0, image: 0.039 },
        [Model.GEMINI_2_0_FLASH_IMAGE_PREVIEW]: { input: 0, output: 0, image: 0 },

        // Image generation models
        [Model.IMAGEN_4_0_GENERATE_001]: { input: 0, output: 0, image: 0.04 },
        [Model.IMAGEN_4_0_ULTRA_GENERATE_001]: { input: 0, output: 0, image: 0.06 },
        [Model.IMAGEN_4_0_FAST_GENERATE_001]: { input: 0, output: 0, image: 0.02 },
        [Model.IMAGEN_3_0_GENERATE_002]: { input: 0, output: 0, image: 0.03 },

        // Video generation models (cost per 10-second video as per UI note)
        [Model.VEO_3_0_GENERATE_PREVIEW]: { input: 0, output: 0, video: 0.40 * 10 },
        [Model.VEO_3_0_FAST_GENERATE_PREVIEW]: { input: 0, output: 0, video: 0.15 * 10 },
        [Model.VEO_2_0_GENERATE_001]: { input: 0, output: 0, video: 0.35 * 10 },
    };
    return prices[model as string] || { input: 0, output: 0, image: 0, video: 0 };
};

// New constants for Canvas mode
const CANVAS_SINGLE_FILE_SYSTEM_INSTRUCTION = `You are an expert senior frontend developer. Your task is to generate a complete, self-contained, single-file web application based on the user's request.

**CRITICAL INSTRUCTIONS:**
1.  **Single File Only:** You MUST generate a single \`index.html\` file.
2.  **No External Files:** DO NOT use external CSS or JavaScript files (e.g., \`<link rel="stylesheet" href="style.css">\` or \`<script src="script.js">\`).
3.  **CSS:**
    *   You MUST include the Tailwind CSS CDN script in the \`<head>\` section: \`<script src="https://cdn.tailwindcss.com"></script>\`.
    *   All custom CSS styles MUST be placed inside a \`<style>\` tag within the \`<head>\`.
4.  **JavaScript:**
    *   All JavaScript code MUST be placed inside a \`<script>\` tag at the end of the \`<body>\` tag.
5.  **Output Format:** Your entire response must be ONLY the raw HTML code for the \`index.html\` file.
    *   Your response MUST start directly with \`<!DOCTYPE html>\`.
    *   Your response MUST NOT contain any markdown code fences like \`\`\`html or \`\`\`.
    *   Do not include any explanations, notes, or any text whatsoever outside of the HTML code itself.`;

interface UsageStats {
    totalCost: number;
    breakdown: {
        [modelId: string]: {
            inputTokens: number;
            outputTokens: number;
            images: number;
            videos: number;
            cost: number;
        }
    }
}
interface AppState {
    // Core state
    isStoreInitialized: boolean;
    currentUser: User | null;
    isAuthLoading: boolean;
    isLoginModalOpen: boolean;
    chatHistory: ChatSession[];
    activeChatId: string | null;
    userApiKey: string | null;

    // UI State
    theme: 'light' | 'dark' | 'system';
    isNavSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
    isSchemaModalOpen: boolean;
    isSettingsPanelVisible: boolean;
    settingsInitialTab: string;
    isClearHistoryModalOpen: boolean;
    isResetUsageModalOpen: boolean;
    chatToDelete: string | null;
    isPreviewModalOpen: boolean;
    previewFile: Attachment | null;
    isSearchVisible: boolean;
    searchQuery: string;
    scrollToMessageId: string | null;
    
    // Live Conversation State
    isLiveConversationOpen: boolean;
    liveConversationModel: LiveConversationModel;

    // Generation State
    isLoading: boolean;
    abortController: AbortController | null;

    // Model & Generation Config
    selectedModel: Model | string;
    systemInstruction: string;
    tokenCount: number;
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    stopSequence: string;
    mediaResolution: MediaResolution;
    
    // Tools State
    isCodeInterpreterActive: boolean;
    isDeepResearchToggled: boolean;
    isImageToolActive: boolean;
    isVideoToolActive: boolean;
    useGoogleSearch: boolean;
    useUrlContext: boolean;
    urlContext: string;
    useStructuredOutput: boolean;
    responseSchema: string;
    useCodeExecution: boolean;
    useFunctionCalling: boolean;
    
    // Thinking Config
    useThinking: boolean;
    useThinkingBudget: boolean;
    thinkingBudget: number;

    // Image Gen Config
    numberOfImages: number;
    aspectRatio: string;
    negativePrompt: string;
    seed?: number;
    personGeneration: string;

    // Code Interpreter State
    isCodePanelVisible: boolean;
    isWidePreview: boolean;
    activeInterpreterFile: string;
    streamingTarget: StreamingTarget | null;
    isGeneratingCode: boolean;
    codeGenerationSignal: 'start' | 'end' | null;
    
    // Usage Tracking
    usageStats: UsageStats;
}

interface AppActions {
    // Session Initialization
    initializeApp: () => Promise<void>;
    loadUserData: (userId: string) => Promise<void>;
    login: (user: User) => void;
    logout: () => void;
    signUp: (name: string) => void;
    continueAsGuest: () => void;
    showLoginPrompt: () => void;

    // API Key
    setUserApiKey: (key: string | null) => void;

    // Chat Management
    newChat: () => void;
    selectChat: (chatId: string) => void;
    deleteChat: (chatId: string) => void;
    setChatToDelete: (chatId: string | null) => void;
    confirmDeleteChat: () => void;
    renameChat: (chatId: string, title: string) => void;
    confirmClearHistory: () => void;
    exportHistory: () => void;
    
    // Message Handling
    sendMessage: (prompt: string, attachments?: Attachment[]) => Promise<void>;
    stopGeneration: () => void;
    deleteAttachment: (messageIndex: number, attachmentIndex: number) => void;

    // UI Actions
    setTheme: (theme: AppState['theme']) => void;
    toggleNavSidebar: () => void;
    toggleRightPanel: (isMobile: boolean) => void;
    closeAllSidebars: () => void;
    openSchemaModal: () => void;
    closeSchemaModal: () => void;
    openSettingsPanel: (tab: string) => void;
    closeSettingsPanel: () => void;
    setIsClearHistoryModalOpen: (isOpen: boolean) => void;
    setIsResetUsageModalOpen: (isOpen: boolean) => void;
    openPreviewModal: (file: Attachment) => void;
    closePreviewModal: () => void;
    toggleSearchVisibility: () => void;
    setSearchQuery: (query: string) => void;
    selectChatAndScrollToMessage: (chatId: string, messageId: string | null) => void;
    clearScrollToMessage: () => void;
    
    // Live Conversation Actions
    setIsLiveConversationOpen: (isOpen: boolean) => void;
    setLiveConversationModel: (model: LiveConversationModel) => void;

    // Model & Config Setters
    setSelectedModel: (modelId: Model | string) => void;
    setSystemInstruction: (instruction: string) => void;
    setTokenCount: (count: number) => void;
    setTemperature: (temp: number) => void;
    setTopP: (val: number) => void;
    setTopK: (val: number) => void;
    setMaxOutputTokens: (val: number) => void;
    setStopSequence: (val: string) => void;
    setMediaResolution: (res: MediaResolution) => void;
    
    // Tools Setters
    toggleCodeInterpreter: () => void;
    toggleDeepResearch: () => void;
    toggleImageTool: () => void;
    toggleVideoTool: () => void;
    setUseGoogleSearch: (val: boolean) => void;
    setUseUrlContext: (val: boolean) => void;
    setUrlContext: (val: string) => void;
    setUseStructuredOutput: (val: boolean) => void;
    setResponseSchema: (val: string) => void;
    setUseCodeExecution: (val: boolean) => void;
    setUseFunctionCalling: (val: boolean) => void;

    // Thinking Setters
    setUseThinking: (val: boolean) => void;
    setUseThinkingBudget: (val: boolean) => void;
    setThinkingBudget: (val: number) => void;
    
    // Image Gen Setters
    setNumberOfImages: (val: number) => void;
    setAspectRatio: (val: string) => void;
    setNegativePrompt: (val: string) => void;
    setSeed: (val: number | undefined) => void;
    setPersonGeneration: (val: string) => void;
    
    // Code Interpreter Actions
    setIsCodePanelVisible: (visible: boolean) => void;
    setIsWidePreview: (isWide: boolean) => void;
    handleProjectChange: (project: Project) => void;
    handleOpenProjectVersion: (project: Project) => void;
    onStreamComplete: () => void;
    resetCodeGenerationSignal: () => void;

    // Usage Tracking Actions
    _addUsage: (model: string, inputTokens: number, outputTokens: number, images?: number, videos?: number) => void;
    confirmResetUsage: () => void;
}

const initialState: AppState = {
    isStoreInitialized: false,
    currentUser: null,
    isAuthLoading: true,
    isLoginModalOpen: false,
    chatHistory: [],
    activeChatId: null,
    userApiKey: null,
    theme: 'system',
    isNavSidebarOpen: false,
    isRightSidebarOpen: false,
    isSchemaModalOpen: false,
    isSettingsPanelVisible: false,
    settingsInitialTab: 'general',
    isClearHistoryModalOpen: false,
    isResetUsageModalOpen: false,
    chatToDelete: null,
    isPreviewModalOpen: false,
    previewFile: null,
    isSearchVisible: false,
    searchQuery: '',
    scrollToMessageId: null,
    isLiveConversationOpen: false,
    liveConversationModel: LiveConversationModel.GEMINI_2_5_FLASH_NATIVE_AUDIO,
    isLoading: false,
    abortController: null,
    selectedModel: Model.GEMINI_2_5_FLASH,
    systemInstruction: '',
    tokenCount: 0,
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048,
    stopSequence: '',
    mediaResolution: MediaResolution.DEFAULT,
    isCodeInterpreterActive: false,
    isDeepResearchToggled: false,
    isImageToolActive: false,
    isVideoToolActive: false,
    useGoogleSearch: false,
    useUrlContext: false,
    urlContext: '',
    useStructuredOutput: false,
    responseSchema: '{}',
    useCodeExecution: false,
    useFunctionCalling: false,
    useThinking: false,
    useThinkingBudget: false,
    thinkingBudget: 1024,
    numberOfImages: 1,
    aspectRatio: '1:1',
    negativePrompt: '',
    seed: undefined,
    personGeneration: 'allow_all',
    isCodePanelVisible: false,
    isWidePreview: false,
    activeInterpreterFile: 'index.html',
    streamingTarget: null,
    isGeneratingCode: false,
    codeGenerationSignal: null,
    usageStats: { totalCost: 0, breakdown: {} },
};

export const useAppStore = create<AppState & AppActions>()(
    (set, get) => ({
      ...initialState,

      initializeApp: async () => {
        if (get().isStoreInitialized) return;
        set({ isAuthLoading: true });
        
        const user = authService.getCurrentUser();
        
        if (user) {
            set({ currentUser: user, isLoginModalOpen: false });
            await get().loadUserData(user.id);
        } else {
            set({ isLoginModalOpen: true });
        }

        set({ isAuthLoading: false, isStoreInitialized: true });
      },

      loadUserData: async (userId: string) => {
        try {
            const theme = localStorage.getItem('theme') as AppState['theme'] || 'system';
            const userApiKey = localStorage.getItem('userApiKey') || null;
            
            const storedModel = localStorage.getItem('liveConversationModel');
            const liveConversationModel = Object.values(LiveConversationModel).includes(storedModel as LiveConversationModel)
                ? storedModel as LiveConversationModel
                : LiveConversationModel.GEMINI_2_5_FLASH_NATIVE_AUDIO;
            
            const usageStats = JSON.parse(localStorage.getItem('usageStats') || JSON.stringify(initialState.usageStats));
            
            set({ theme, userApiKey, liveConversationModel, usageStats });
            
            const chatHistory = await localDb.getChats(userId);

            set({
                chatHistory,
                activeChatId: chatHistory.length > 0 ? chatHistory[0].id : null,
            });

            if (chatHistory.length === 0) {
                get().newChat();
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            set({ chatHistory: [], activeChatId: null });
            get().newChat();
        }
      },
      
      login: (user: User) => {
        authService.login(user.id);
        set({ chatHistory: [], activeChatId: null });
        get().loadUserData(user.id).then(() => {
            set({ currentUser: user, isLoginModalOpen: false });
        });
      },

      logout: () => {
        authService.logout();
        set({ ...initialState, isStoreInitialized: true, isLoginModalOpen: true, chatHistory: [], activeChatId: null });
      },

      signUp: (name: string) => {
        const user = authService.signUp(name);
        set({ chatHistory: [], activeChatId: null });
        get().loadUserData(user.id).then(() => {
            set({ currentUser: user, isLoginModalOpen: false });
        });
      },

      continueAsGuest: () => {
        const guest = authService.continueAsGuest();
        set({ chatHistory: [], activeChatId: null });
        get().loadUserData(guest.id).then(() => {
            set({ currentUser: guest, isLoginModalOpen: false });
        });
      },
      
      showLoginPrompt: () => {
        set({ isLoginModalOpen: true });
      },

      setUserApiKey: (key) => {
        set({ userApiKey: key });
        if (key) {
            localStorage.setItem('userApiKey', key);
        } else {
            localStorage.removeItem('userApiKey');
        }
      },

      newChat: async () => {
        const userId = get().currentUser?.id;
        if (!userId) return;
        
        const activeChat = getActiveChat(get());
        if (activeChat && activeChat.messages.length === 0) {
            return;
        }
        const newChat: ChatSession = { id: uuidv4(), title: 'New Chat', messages: [], project: createNewProject(), lastModified: Date.now(), userId };
        set(state => ({
            chatHistory: [newChat, ...state.chatHistory],
            activeChatId: newChat.id,
            isCodePanelVisible: false,
            isSearchVisible: false, 
            isSettingsPanelVisible: false,
        }));
        await localDb.saveChat(newChat, userId);
      },

      sendMessage: async (prompt, attachments = []) => {
        if (get().isLoading) return;
        const state = get();
        const userId = state.currentUser?.id;
        if (!userId) { get().showLoginPrompt(); return; }
    
        let activeChat = getActiveChat(state);
        if (!activeChat || (activeChat.messages.length === 0 && !prompt && attachments.length === 0)) {
            await get().newChat();
            activeChat = getActiveChat(get());
        }
        if (!activeChat) return;
    
        const chatHistoryForApi = activeChat.messages;
        const userMessage: ChatMessage = {
            id: uuidv4(), role: Role.USER, content: prompt,
            parts: [{ text: prompt }, ...attachments.map(a => ({ inlineData: { mimeType: a.mimeType, data: a.dataUrl.split(',')[1] } }))],
            attachments: attachments,
        };
    
        if (state.isCodeInterpreterActive) {
            // [Canvas Mode Logic]
            set({ isLoading: true, abortController: new AbortController(), isCodePanelVisible: true });
            if (!activeChat.project) activeChat.project = createNewProject();
            if (!activeChat.project.files['index.html']) activeChat.project.files['index.html'] = { name: 'index.html', content: '<!-- AI is generating code... Please wait. -->' };
            const historyWithUserMsg = updateActiveChat(get(), chat => { chat.messages.push(userMessage); if (chat.messages.length === 1) chat.title = prompt.substring(0, 50); chat.project = activeChat!.project; chat.lastModified = Date.now(); });
            set({ chatHistory: historyWithUserMsg, activeInterpreterFile: 'index.html' });
            await localDb.saveChat(getActiveChat(get())!, userId);
            try {
                const stream = await generateResponseStream({
                    prompt,
                    attachments,
                    history: chatHistoryForApi,
                    model: state.selectedModel,
                    systemInstruction: CANVAS_SINGLE_FILE_SYSTEM_INSTRUCTION,
                    temperature: state.temperature,
                    maxOutputTokens: state.maxOutputTokens || undefined,
                    topP: state.topP,
                    topK: state.topK,
                    useGoogleSearch: false,
                    useCodeExecution: false,
                    useThinking: false,
                    useThinkingBudget: false,
                    thinkingBudget: 0,
                    isProModel: false,
                    responseSchema: undefined,
                    signal: get().abortController!.signal,
                });
                let accumulatedCode = '';
                for await (const chunk of stream) {
                    if (get().abortController?.signal.aborted) throw new Error('Aborted by user.');
                    const chunkText = chunk.text; if (chunkText) { accumulatedCode += chunkText; set({ streamingTarget: { filePath: 'index.html', code: accumulatedCode } }); }
                }
                const cleanCode = (code: string) => code.replace(/^```(?:html)?\s*|```\s*$/g, '').trim();
                const finalCleanCode = cleanCode(accumulatedCode);
                const modelMessage: ChatMessage = { id: uuidv4(), role: Role.MODEL, content: "I've created a project for you.", parts: [{ text: "I've created a project for you." }], projectFilesUpdate: true, project: getActiveChat(get())!.project };
                const finalHistory = updateActiveChat(get(), chat => { 
                    if (chat.project) { 
                         // Deep clone to trigger React updates
                        chat.project = { 
                            ...chat.project, 
                            files: JSON.parse(JSON.stringify(chat.project.files)) 
                        };
                        findAndUpdateFile(chat.project.files, 'index.html', finalCleanCode); 
                        modelMessage.project = chat.project; 
                    } 
                    chat.messages.push(modelMessage); 
                });
                set({ chatHistory: finalHistory });
                const finalResponse = await (stream as any).response; if (finalResponse?.usageMetadata) { get()._addUsage(state.selectedModel, finalResponse.usageMetadata.promptTokenCount, finalResponse.usageMetadata.candidatesTokenCount); }
            } catch (error: any) {
                if (error.name === 'AbortError' || error.message.includes('Aborted')) return;
                const errorMessage = `An error occurred in Canvas mode: ${error.message}`;
                const errorMsg: ChatMessage = { id: uuidv4(), role: Role.MODEL, content: errorMessage, parts: [] };
                set(s => ({ chatHistory: updateActiveChat(s, c => { c.messages.push(errorMsg); })}));
            } finally {
                set({ isLoading: false, abortController: null, streamingTarget: null });
                const finalChatState = getActiveChat(get()); if (finalChatState) await localDb.saveChat(finalChatState, userId);
            }
            return;
        }
    
        const isFirstMessage = activeChat.messages.length === 0;
        const newTitle = isFirstMessage ? prompt.substring(0, 50) : activeChat.title;
        const newChatHistory = updateActiveChat(get(), chat => { chat.messages.push(userMessage); chat.title = newTitle; chat.lastModified = Date.now(); });
        set({ chatHistory: newChatHistory });
        await localDb.saveChat(newChatHistory.find(c => c.id === activeChat!.id)!, userId);
    
        set({ isLoading: true, abortController: new AbortController() });
            
        const isProModel = state.selectedModel === Model.GEMINI_2_5_PRO || state.selectedModel === Model.GEMINI_3_PRO_PREVIEW;
        const activeBaseModel = state.selectedModel as Model;
        const isTextToImageModel = [Model.IMAGEN_4_0_GENERATE_001, Model.IMAGEN_4_0_ULTRA_GENERATE_001, Model.IMAGEN_4_0_FAST_GENERATE_001, Model.IMAGEN_3_0_GENERATE_002].includes(activeBaseModel as Model);
        const isVideoModel = [Model.VEO_2_0_GENERATE_001, Model.VEO_3_0_GENERATE_PREVIEW, Model.VEO_3_0_FAST_GENERATE_PREVIEW].includes(activeBaseModel as Model);

        let systemInstruction = state.systemInstruction;
    
        try {
             if (state.isImageToolActive && isTextToImageModel) {
                const modelMessage: ChatMessage = { id: uuidv4(), role: Role.MODEL, content: 'Generating images...', parts: [], attachments: [], isThinking: true };
                set(s => ({ chatHistory: updateActiveChat(s, c => { c.messages.push(modelMessage); }) }));
                const response = await generateImage({ prompt, model: activeBaseModel as Model, numberOfImages: state.numberOfImages, aspectRatio: state.aspectRatio, negativePrompt: state.negativePrompt, seed: state.seed, signal: get().abortController!.signal });
                const generatedAttachments: Attachment[] = [];
                if (response.generatedImages) { for (const img of response.generatedImages) { if (img.image?.imageBytes) { generatedAttachments.push({ name: `generated_image_${Date.now()}.png`, mimeType: 'image/png', dataUrl: `data:image/png;base64,${img.image.imageBytes}` }); } } }
                set(s => ({ chatHistory: updateActiveChat(s, c => { const lastMsg = c.messages[c.messages.length - 1]; lastMsg.content = `Generated ${generatedAttachments.length} image(s).`; lastMsg.attachments = generatedAttachments; lastMsg.isThinking = false; })}));
                get()._addUsage(activeBaseModel, 0, 0, generatedAttachments.length, 0);
            } else if (state.isVideoToolActive && isVideoModel) {
                const modelMessage: ChatMessage = { id: uuidv4(), role: Role.MODEL, content: 'Generating video... this may take a few minutes.', parts: [], isThinking: true };
                set(s => ({ chatHistory: updateActiveChat(s, c => { c.messages.push(modelMessage); }) }));
                const videoAttachment = await generateVideo({ prompt, model: activeBaseModel as Model, imageAttachment: attachments.find(a => a.mimeType.startsWith('image/')), signal: get().abortController?.signal });
                set(s => ({ chatHistory: updateActiveChat(s, c => { const lastMsg = c.messages[c.messages.length - 1]; lastMsg.content = 'Video generated successfully.'; lastMsg.attachments = [videoAttachment]; lastMsg.isThinking = false; })}));
                get()._addUsage(activeBaseModel, 0, 0, 0, 1);
            } else {
                const modelMessage: ChatMessage = { id: uuidv4(), role: Role.MODEL, content: '', parts: [], isThinking: true, isParsingReasoning: true };
                set(s => ({ chatHistory: updateActiveChat(s, c => { c.messages.push(modelMessage); }) }));
                
                const stream = await generateResponseStream({
                    prompt: prompt, attachments: attachments, history: chatHistoryForApi, model: state.selectedModel, systemInstruction: systemInstruction, temperature: state.temperature, maxOutputTokens: state.maxOutputTokens || undefined, topP: state.topP, topK: state.topK, useGoogleSearch: state.isDeepResearchToggled, useCodeExecution: state.useCodeExecution, useThinking: state.useThinking, useThinkingBudget: state.useThinkingBudget, thinkingBudget: state.thinkingBudget, isProModel: isProModel, responseSchema: state.useStructuredOutput ? JSON.parse(state.responseSchema) : undefined, signal: get().abortController!.signal });
                
                for await (const chunk of stream) {
                    set(s => ({
                        chatHistory: updateActiveChat(s, c => {
                            const lastMsg = c.messages[c.messages.length - 1];
                            const parts = chunk.candidates?.[0]?.content?.parts || []; let hasThoughtsInChunk = false; let hasContentInChunk = false;
                            for (const part of parts) { if (!part.text) continue; if ((part as any).thought) { lastMsg.reasoning = (lastMsg.reasoning || '') + part.text; hasThoughtsInChunk = true; } else { lastMsg.content = (lastMsg.content || '') + part.text; hasContentInChunk = true; } }
                            if (hasThoughtsInChunk) { lastMsg.isThinking = true; if (lastMsg.isParsingReasoning) lastMsg.isParsingReasoning = false; } else if (hasContentInChunk) { lastMsg.isThinking = false; if (lastMsg.isParsingReasoning) lastMsg.isParsingReasoning = false; }
                            const functionCall = chunk.candidates?.[0]?.content?.parts?.find(p => p.functionCall)?.functionCall; if (functionCall?.name === 'codeExecution' && functionCall.args?.code) { lastMsg.codeToExecute = (lastMsg.codeToExecute || '') + functionCall.args.code; }
                            const groundingMeta = chunk.candidates?.[0]?.groundingMetadata; 
                            if (groundingMeta?.groundingChunks) { lastMsg.groundingChunks = groundingMeta.groundingChunks; }
                            const imagePart = chunk.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType.startsWith('image/'));
                            if (imagePart && imagePart.inlineData) {
                                lastMsg.attachments = lastMsg.attachments || [];
                                const dataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                                const attachment: Attachment = { name: `edited_image_${Date.now()}.png`, mimeType: imagePart.inlineData.mimeType, dataUrl: dataUrl }; lastMsg.attachments.push(attachment);
                            }
                        })
                    }));
                }
                const finalResponse = await (stream as any).response;
                if (finalResponse?.usageMetadata) { get()._addUsage(activeBaseModel, finalResponse.usageMetadata.promptTokenCount, finalResponse.usageMetadata.candidatesTokenCount); }
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
              console.error('Error during sendMessage:', error);
              const errorMessage = `An error occurred: ${error.message || 'Please check the console for details.'}`;
              set(s => ({ chatHistory: updateActiveChat(s, c => { const lastMsg = c.messages.length > 0 ? c.messages[c.messages.length - 1] : null; if (!lastMsg || lastMsg.role !== Role.MODEL) { const errorMsg: ChatMessage = { id: uuidv4(), role: Role.MODEL, content: errorMessage, parts: [] }; c.messages.push(errorMsg); } else { lastMsg.content = errorMessage; lastMsg.isThinking = false; } })}));
            }
        } finally {
            set(s => ({ isLoading: false, abortController: null, chatHistory: updateActiveChat(s, c => { const lastMsg = c.messages[c.messages.length - 1]; if (lastMsg && lastMsg.role === Role.MODEL) { lastMsg.isThinking = false; lastMsg.isParsingReasoning = false; } })}));
            const finalChatState = getActiveChat(get());
            if (finalChatState) { await localDb.saveChat(finalChatState, userId); }
        }
      },
      
      _addUsage: (model, inputTokens, outputTokens, images = 0, videos = 0) => {
          let cost = 0;
          if (model === Model.GEMINI_2_5_PRO || model === Model.GEMINI_3_PRO_PREVIEW) {
              // Pricing logic for Pro models
              let inputPrice = 0;
              let outputPrice = 0;
              
              if (model === Model.GEMINI_3_PRO_PREVIEW) {
                  // Gemini 3 Pro Preview Pricing
                  inputPrice = inputTokens <= 200000 ? (2.00 / 1_000_000) : (4.00 / 1_000_000);
                  outputPrice = outputTokens <= 200000 ? (12.00 / 1_000_000) : (18.00 / 1_000_000);
              } else {
                  // Gemini 2.5 Pro Pricing
                  inputPrice = inputTokens <= 200000 ? (1.25 / 1_000_000) : (2.50 / 1_000_000);
                  outputPrice = outputTokens <= 200000 ? (10.00 / 1_000_000) : (15.00 / 1_000_000);
              }
              
              cost = (inputTokens * inputPrice) + (outputTokens * outputPrice);
          } else {
              const pricing = getPricing(model);
              cost = (inputTokens * pricing.input) + (outputTokens * pricing.output) + (images * (pricing.image || 0)) + (videos * (pricing.video || 0));
          }
          
          set(state => {
              const newStats = JSON.parse(JSON.stringify(state.usageStats));
              newStats.totalCost += cost;
              const modelId = model;
              if (!newStats.breakdown[modelId]) {
                  newStats.breakdown[modelId] = { inputTokens: 0, outputTokens: 0, images: 0, videos: 0, cost: 0 };
              }
              const modelStats = newStats.breakdown[modelId];
              modelStats.inputTokens += inputTokens;
              modelStats.outputTokens += outputTokens;
              modelStats.images += images;
              modelStats.videos += videos;
              modelStats.cost += cost;

              localStorage.setItem('usageStats', JSON.stringify(newStats));
              return { usageStats: newStats };
          });
      },
      confirmResetUsage: () => {
        const newStats = { totalCost: 0, breakdown: {} };
        set({ usageStats: newStats });
        localStorage.setItem('usageStats', JSON.stringify(newStats));
      },
      // Keep other actions as they are
      deleteChat: async (chatId) => { await localDb.deleteChat(chatId); set(state => { const newHistory = state.chatHistory.filter(c => c.id !== chatId); let newActiveId = state.activeChatId; if (state.activeChatId === chatId) { newActiveId = newHistory.length > 0 ? newHistory[0].id : null; } if (newHistory.length === 0) { get().newChat(); return { chatHistory: [], activeChatId: null }; } return { chatHistory: newHistory, activeChatId: newActiveId }; }); },
      setChatToDelete: (chatId) => set({ chatToDelete: chatId }),
      confirmDeleteChat: () => { const chatId = get().chatToDelete; if (chatId) get().deleteChat(chatId); set({ chatToDelete: null }); },
      renameChat: async (chatId, title) => { const userId = get().currentUser?.id; if (!userId) return; const state = get(); const chatToUpdate = state.chatHistory.find(c => c.id === chatId); if (chatToUpdate) { const updatedChat = { ...chatToUpdate, title, lastModified: Date.now() }; set({ chatHistory: state.chatHistory.map(c => c.id === chatId ? updatedChat : c), }); await localDb.saveChat(updatedChat, userId); } },
      confirmClearHistory: async () => { const userId = get().currentUser?.id; if (!userId) return; await localDb.clearChats(userId); set({ chatHistory: [], activeChatId: null, isCodePanelVisible: false }); get().newChat(); },
      exportHistory: () => { const dataStr = JSON.stringify(get().chatHistory, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'chat_history.json'; a.click(); URL.revokeObjectURL(url); },
      stopGeneration: () => { get().abortController?.abort(); set({ isLoading: false, abortController: null, isGeneratingCode: false }); },
      deleteAttachment: async (messageIndex, attachmentIndex) => { const activeChat = getActiveChat(get()); if (!activeChat) return; const newHistory = updateActiveChat(get(), chat => { const msgToUpdate = chat.messages[messageIndex]; if (msgToUpdate && msgToUpdate.attachments) { msgToUpdate.attachments.splice(attachmentIndex, 1); } }); set({ chatHistory: newHistory }); const updatedChat = newHistory.find(c => c.id === activeChat.id); if (updatedChat) { const userId = get().currentUser?.id; if(userId) await localDb.saveChat(updatedChat, userId); } },
      setTheme: (theme) => { set({ theme }); localStorage.setItem('theme', theme); },
      toggleNavSidebar: () => set(state => ({ isNavSidebarOpen: !state.isNavSidebarOpen, isRightSidebarOpen: false })),
      toggleRightPanel: (isMobile) => { set(state => ({ isRightSidebarOpen: !state.isRightSidebarOpen, ...(isMobile && { isNavSidebarOpen: false })})); },
      closeAllSidebars: () => set({ isNavSidebarOpen: false, isRightSidebarOpen: false }),
      openSchemaModal: () => set({ isSchemaModalOpen: true }),
      closeSchemaModal: () => set({ isSchemaModalOpen: false }),
      openSettingsPanel: (tab) => set({ isSettingsPanelVisible: true, settingsInitialTab: tab, isSearchVisible: false }),
      closeSettingsPanel: () => set({ isSettingsPanelVisible: false }),
      setIsClearHistoryModalOpen: (isOpen) => set({ isClearHistoryModalOpen: isOpen }),
      setIsResetUsageModalOpen: (isOpen) => set({ isResetUsageModalOpen: isOpen }),
      openPreviewModal: (file) => set({ isPreviewModalOpen: true, previewFile: file }),
      closePreviewModal: () => set({ isPreviewModalOpen: false, previewFile: null }),
      toggleSearchVisibility: () => set(state => ({ isSearchVisible: !state.isSearchVisible, searchQuery: '', isSettingsPanelVisible: false })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      selectChatAndScrollToMessage: (chatId, messageId) => { set({ activeChatId: chatId, scrollToMessageId: messageId, isSearchVisible: false, isSettingsPanelVisible: false, }); },
      clearScrollToMessage: () => set({ scrollToMessageId: null }),
      setIsLiveConversationOpen: (isOpen) => set({ isLiveConversationOpen: isOpen }),
      setLiveConversationModel: (model) => { set({ liveConversationModel: model }); localStorage.setItem('liveConversationModel', model); },
      setSelectedModel: (modelId) => { 
          const isAlwaysThinking = modelId === Model.GEMINI_2_5_PRO || modelId === Model.GEMINI_3_PRO_PREVIEW; 
          set({ selectedModel: modelId, useThinking: isAlwaysThinking }); 
      },
      setSystemInstruction: (instruction) => set({ systemInstruction: instruction }),
      setTokenCount: (count) => set({ tokenCount: count }),
      setTemperature: (temp) => set({ temperature: temp }),
      setTopP: (val) => set({ topP: val }),
      setTopK: (val) => set({ topK: val }),
      setMaxOutputTokens: (val) => set({ maxOutputTokens: val }),
      setStopSequence: (val) => set({ stopSequence: val }),
      setMediaResolution: (res) => set({ mediaResolution: res }),
      toggleCodeInterpreter: () => set(state => ({ isCodeInterpreterActive: !state.isCodeInterpreterActive, isDeepResearchToggled: false, isImageToolActive: false, isVideoToolActive: false, useCodeExecution: false, useStructuredOutput: false })),
      toggleDeepResearch: () => set(state => ({ isDeepResearchToggled: !state.isDeepResearchToggled, isCodeInterpreterActive: false, isImageToolActive: false, isVideoToolActive: false })),
      toggleImageTool: () => set(state => ({ isImageToolActive: !state.isImageToolActive, isCodeInterpreterActive: false, isDeepResearchToggled: false, isVideoToolActive: false })),
      toggleVideoTool: () => set(state => ({ isVideoToolActive: !state.isVideoToolActive, isCodeInterpreterActive: false, isDeepResearchToggled: false, isImageToolActive: false })),
      setUseGoogleSearch: (val) => set(state => ({ useGoogleSearch: val, ...(val && { useStructuredOutput: false }) })),
      setUseUrlContext: (val) => set({ useUrlContext: val }),
      setUrlContext: (val) => set({ urlContext: val }),
      setUseStructuredOutput: (val) => set(state => ({ useStructuredOutput: val, ...(val && { useGoogleSearch: false, isCodeInterpreterActive: false }) })),
      setResponseSchema: (val) => set({ responseSchema: val }),
      setUseCodeExecution: (val) => set(state => ({ useCodeExecution: val, isCodeInterpreterActive: false })),
      setUseFunctionCalling: (val) => set({ useFunctionCalling: val }),
      setUseThinking: (val) => set({ useThinking: val }),
      setUseThinkingBudget: (val) => set({ useThinkingBudget: val }),
      setThinkingBudget: (val) => set({ thinkingBudget: val }),
      setNumberOfImages: (val) => set({ numberOfImages: val }),
      setAspectRatio: (val) => set({ aspectRatio: val }),
      setNegativePrompt: (val) => set({ negativePrompt: val }),
      setSeed: (val) => set({ seed: val }),
      setPersonGeneration: (val) => set({ personGeneration: val }),
      setIsCodePanelVisible: (visible) => set({ isCodePanelVisible: visible }),
      setIsWidePreview: (isWide) => set({ isWidePreview: isWide }),
      handleProjectChange: async (project) => { set(state => ({ chatHistory: updateActiveChat(state, chat => { chat.project = project }) })); const activeChat = getActiveChat(get()); if (activeChat) { const userId = get().currentUser?.id; if (!userId) return; await localDb.saveChat(activeChat, userId); } },
      handleOpenProjectVersion: (project) => { set({ isCodePanelVisible: true, isCodeInterpreterActive: true, isWidePreview: false, }); get().handleProjectChange(project); },
      onStreamComplete: () => set({ streamingTarget: null, isGeneratingCode: false, codeGenerationSignal: 'end' }),
      resetCodeGenerationSignal: () => set({ codeGenerationSignal: null }),
      selectChat: (chatId) => { const chat = get().chatHistory.find(c => c.id === chatId); if (chat) { set({ activeChatId: chatId, scrollToMessageId: null, isCodePanelVisible: !!chat.project && chat.messages.some(m => m.projectFilesUpdate), isSearchVisible: false, isSettingsPanelVisible: false, }); } },

    })
);
