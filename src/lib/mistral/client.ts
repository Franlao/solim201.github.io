import { Mistral } from '@mistralai/mistralai';

// Configuration du client Mistral AI
const MISTRAL_API_KEY = import.meta.env.MISTRAL_API_KEY;

if (!MISTRAL_API_KEY) {
  throw new Error('MISTRAL_API_KEY environment variable is required');
}

export const mistralClient = new Mistral({
  apiKey: MISTRAL_API_KEY,
});

// Types pour le RAG
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RAGResponse {
  answer: string;
  sources: string[];
  confidence: number;
}

// Configuration des modèles
export const MODELS = {
  CHAT: 'mistral-large-latest',
  EMBED: 'mistral-embed',
  SMALL: 'mistral-small-latest'
} as const;

// Paramètres par défaut
export const DEFAULT_PARAMS = {
  temperature: 0.7,
  maxTokens: 1000,
  topP: 0.9,
} as const;