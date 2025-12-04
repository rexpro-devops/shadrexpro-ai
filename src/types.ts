
import { GenerateContentResponse, Part } from '@google/genai';

export enum Model {
  GEMINI_3_PRO_PREVIEW = 'gemini-3-pro-preview',
  GEMINI_3_PRO_IMAGE_PREVIEW = 'gemini-3-pro-image-preview',
  GEMINI_2_5_PRO = 'gemini-2.5-pro',
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE = 'gemini-2.5-flash-lite',
  GEMINI_2_5_FLASH_IMAGE = 'gemini-2.5-flash-image',
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite',
  GEMINI_2_0_FLASH_IMAGE_PREVIEW = 'gemini-2.0-flash-preview-image-generation',
  IMAGEN_4_0_GENERATE_001 = 'imagen-4.0-generate-001',
  IMAGEN_4_0_ULTRA_GENERATE_001 = 'imagen-4.0-ultra-generate-001',
  IMAGEN_4_0_FAST_GENERATE_001 = 'imagen-4.0-fast-generate-001',
  IMAGEN_3_0_GENERATE_002 = 'imagen-3.0-generate-002',
  VEO_3_0_GENERATE_PREVIEW = 'veo-3.0-generate-preview',
  VEO_3_0_FAST_GENERATE_PREVIEW = 'veo-3.0-fast-generate-preview',
  VEO_2_0_GENERATE_001 = 'veo-2.0-generate-001',
}

export interface User {
  id: string;
  name: string;
  isGuest: boolean;
}

export enum Role {
  USER = 'user',
  MODEL = 'model',
  TOOL = 'tool',
}

export interface Attachment {
  name: string;
  mimeType: string;
  dataUrl: string; // For local preview and immediate API use.
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string; // For simple text display, derived from the text part(s)
  parts: Part[]; // The authoritative source of message content for API calls. Can be excluded from Firestore.
  attachments?: Attachment[];
  reasoning?: string;
  isThinking?: boolean;
  isParsingReasoning?: boolean;
  projectFilesUpdate?: boolean;
  project?: Project;
  groundingChunks?: any[];
  citations?: { sourceName: string; content: string }[];
  codeToExecute?: string;
  toolOutput?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  project?: Project;
  lastModified: number;
  userId?: string;
}

export enum MediaResolution {
    DEFAULT = 'default',
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
}

export enum LiveConversationModel {
  GEMINI_2_5_FLASH_NATIVE_AUDIO = 'gemini-2.5-flash-native-audio-preview-09-2025',
}

// Types for Code Interpreter
export type FileSystemNode = {
  name: string;
  content?: string;
  children?: { [key: string]: FileSystemNode };
};

export interface Project {
  id: string;
  name: string;
  description: string;
  files: { [key: string]: FileSystemNode };
}

export interface StreamingTarget {
    filePath: string;
    code: string;
}

export const initialFiles: { [key:string]: FileSystemNode } = {};

// Settings to be stored in localStorage
export interface UserSettings {
    theme: 'light' | 'dark' | 'system';
    userApiKey: string | null;
    liveConversationModel: LiveConversationModel;
}

export interface AppState {
    isStoreInitialized: boolean;
    // ... other properties
}