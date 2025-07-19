import { mistralClient, type ChatMessage, type RAGResponse, MODELS, DEFAULT_PARAMS } from '../mistral/client.js';
import { vectorDB } from './simple-vectordb.js';

export class RAGRetriever {
  
  // Générer une réponse basée sur la requête utilisateur
  async generateResponse(
    query: string, 
    conversationHistory: ChatMessage[] = []
  ): Promise<RAGResponse> {
    try {
      // S'assurer que la base est initialisée
      const count = await vectorDB.getCount();
      if (count === 0) {
        console.log('⚠️ Base vide, initialisation automatique...');
        await this.initializeIfEmpty();
      }
      
      // 1. Rechercher des documents pertinents
      const searchResults = await vectorDB.search(query, 5);
      
      if (searchResults.documents.length === 0) {
        return {
          answer: "Je n'ai pas trouvé d'informations pertinentes pour répondre à votre question. Pouvez-vous reformuler ou poser une question plus spécifique sur mon parcours, mes compétences ou mes projets ?",
          sources: [],
          confidence: 0.1
        };
      }

      // 2. Préparer le contexte à partir des documents récupérés
      const context = this.buildContext(searchResults);
      
      // 3. Construire le prompt avec le contexte
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(query, context);
      
      // 4. Préparer l'historique de conversation
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6), // Garder seulement les 6 derniers messages
        { role: 'user', content: userPrompt }
      ];

      // 5. Générer la réponse avec Mistral
      const completion = await mistralClient.chat.complete({
        model: MODELS.CHAT,
        messages: messages,
        temperature: DEFAULT_PARAMS.temperature,
        maxTokens: DEFAULT_PARAMS.maxTokens,
        topP: DEFAULT_PARAMS.topP,
      });

      const rawAnswer = completion.choices?.[0]?.message?.content;
      let answer: string;
      
      if (typeof rawAnswer === 'string') {
        answer = rawAnswer;
      } else if (Array.isArray(rawAnswer)) {
        // Si c'est un tableau de ContentChunk, extraire le texte
        answer = rawAnswer.map(chunk => {
          if (typeof chunk === 'string') {
            return chunk;
          } else if (chunk && typeof chunk === 'object' && 'type' in chunk) {
            // Gérer les différents types de ContentChunk
            if (chunk.type === 'text' && 'text' in chunk) {
              return chunk.text;
            } else if ('content' in chunk && typeof chunk.content === 'string') {
              return chunk.content;
            }
          }
          return String(chunk);
        }).join(' ');
      } else {
        answer = "Désolé, je n'ai pas pu générer une réponse.";
      }
      
      // 6. Extraire les sources
      const sources = this.extractSources(searchResults);
      
      // 7. Calculer la confiance basée sur les distances
      const confidence = this.calculateConfidence(searchResults.distances);

      return {
        answer,
        sources,
        confidence
      };

    } catch (error) {
      console.error('Erreur lors de la génération de la réponse:', error);
      return {
        answer: "Désolé, une erreur s'est produite lors du traitement de votre question. Veuillez réessayer.",
        sources: [],
        confidence: 0.0
      };
    }
  }

  // Construire le contexte à partir des résultats de recherche
  private buildContext(searchResults: any): string {
    const contextParts: string[] = [];
    
    for (let i = 0; i < searchResults.documents.length; i++) {
      const doc = searchResults.documents[i];
      const metadata = searchResults.metadatas[i];
      const distance = searchResults.distances[i];
      
      // Seulement inclure les documents avec une bonne similarité
      if (distance < 0.7) {
        contextParts.push(`
Source: ${metadata.title} (${metadata.type})
Contenu: ${doc}
        `);
      }
    }
    
    return contextParts.join('\n---\n');
  }

  // Construire le prompt système
  private buildSystemPrompt(): string {
    return `Tu es un assistant IA représentant Solim LAOKPEZI, un AI Engineer et Data Scientist passionné par l'intelligence artificielle.

CONTEXTE SUR SOLIM:
- AI Engineer avec 2+ ans d'expérience
- Spécialisé en IA générative, LLM, RAG et Deep Learning
- Expériences chez IVECO GROUP, CHU de Lille, Laboratoire ERIC
- Compétences: Python, JavaScript, PyTorch, LangChain, OLLAMA, ChromaDB, etc.
- Certifications Microsoft Azure (AZ-900, DP-900, AI-900)

INSTRUCTIONS:
1. Réponds UNIQUEMENT en français
2. Sois naturel, enthousiaste et professionnel
3. Utilise les informations du contexte fourni pour répondre
4. Si tu ne trouves pas d'information dans le contexte, dis-le clairement
5. Mentionne des projets ou expériences spécifiques quand c'est pertinent
6. Reste concentré sur le parcours professionnel de Solim
7. N'invente jamais d'informations non présentes dans le contexte
8. Encourage les questions sur les projets, compétences et expériences

STYLE:
- Utilise "je" pour parler au nom de Solim
- Sois concis mais informatif (150-300 mots max)
- Montre la passion pour l'IA et l'innovation
- Propose des questions de suivi pertinentes`;
  }

  // Construire le prompt utilisateur avec contexte
  private buildUserPrompt(query: string, context: string): string {
    return `CONTEXTE PERTINENT:
${context}

QUESTION DE L'UTILISATEUR:
${query}

Réponds à la question en utilisant les informations du contexte ci-dessus. Si le contexte ne contient pas assez d'informations pour répondre complètement, dis-le clairement et suggère des questions alternatives.`;
  }

  // Extraire les sources à partir des résultats
  private extractSources(searchResults: any): string[] {
    const sources: string[] = [];
    
    for (let i = 0; i < Math.min(3, searchResults.metadatas.length); i++) {
      const metadata = searchResults.metadatas[i];
      const distance = searchResults.distances[i];
      
      if (distance < 0.7) {
        if (metadata.url) {
          sources.push(`${metadata.title} - ${metadata.url}`);
        } else {
          sources.push(metadata.title);
        }
      }
    }
    
    return [...new Set(sources)]; // Supprimer les doublons
  }

  // Calculer la confiance basée sur les distances
  private calculateConfidence(distances: number[]): number {
    if (distances.length === 0) return 0.0;
    
    const avgDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
    
    // Convertir la distance en score de confiance (0-1)
    // Plus la distance est faible, plus la confiance est élevée
    const confidence = Math.max(0, Math.min(1, 1 - avgDistance));
    
    return Math.round(confidence * 100) / 100;
  }

  // Initialiser la base si elle est vide
  private async initializeIfEmpty(): Promise<void> {
    try {
      const { documentProcessor } = await import('./embeddings.js');
      await documentProcessor.indexAllContent();
      console.log('✅ Base initialisée automatiquement');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation automatique:', error);
    }
  }

  // Suggestions de questions basées sur le contenu
  getSuggestedQuestions(): string[] {
    return [
      "Parle-moi de ton expérience chez IVECO GROUP",
      "Quels sont tes projets les plus innovants ?",
      "Quelles sont tes compétences en IA et Machine Learning ?",
      "Peux-tu m'expliquer ce qu'est le RAG ?",
      "Quelles certifications as-tu obtenues ?",
      "Quel est ton parcours en Data Science ?",
      "Comment as-tu développé le générateur de données synthétiques ?",
      "Quels outils d'IA utilises-tu le plus ?",
      "Peux-tu me parler de ton travail sur les LLM ?",
      "Quel est ton projet le plus récent ?"
    ];
  }
}

export const ragRetriever = new RAGRetriever();