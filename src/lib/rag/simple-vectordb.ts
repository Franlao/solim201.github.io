import { mistralClient } from '../mistral/client.js';

// Types pour les documents
export interface Document {
  id: string;
  content: string;
  metadata: {
    title: string;
    type: 'project' | 'experience' | 'skill' | 'pdf' | 'certification';
    source: string;
    url?: string;
    tags?: string[];
    publishDate?: string;
  };
  embedding?: number[];
}

export interface SearchResult {
  documents: string[];
  metadatas: any[];
  distances: number[];
}

class SimpleVectorDatabase {
  private documents: Document[] = [];
  private initialized = false;
  private dimension = 1024; // Dimension des embeddings Mistral

  // Initialiser la base de données en mémoire
  async initialize(): Promise<void> {
    console.log('🚀 Initialisation de la base vectorielle en mémoire...');
    this.initialized = true;
    console.log('✅ Base vectorielle initialisée');
  }

  // Générer un embedding avec Mistral AI
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`🔮 Génération embedding pour: "${text.substring(0, 50)}..."`);
      
      const response = await mistralClient.embeddings.create({
        model: 'mistral-embed',
        inputs: [text],
      });
      
      if (response.data && response.data[0]) {
        console.log(`✅ Embedding généré (${response.data[0].embedding.length} dimensions)`);
        return response.data[0].embedding;
      }
    } catch (error) {
      console.error('❌ Erreur génération embedding:', error);
      
      // Fallback : embedding aléatoire normalisé (pour les tests)
      console.log('🔄 Utilisation d\'un embedding de fallback');
      const embedding = Array.from({ length: this.dimension }, () => Math.random() - 0.5);
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => val / norm);
    }
    
    // Fallback par défaut
    return new Array(this.dimension).fill(0);
  }

  // Calculer la similarité cosinus entre deux vecteurs
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
  }

  // Recherche hybride : embeddings + mots-clés
  private hybridSearch(query: string, queryEmbedding: number[], nResults: number): SearchResult {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    const results: { doc: Document; score: number; semanticScore: number; keywordScore: number }[] = [];

    for (const doc of this.documents) {
      let keywordScore = 0;
      let semanticScore = 0;
      
      // 1. Score sémantique (embeddings)
      if (doc.embedding && doc.embedding.length > 0) {
        semanticScore = this.cosineSimilarity(queryEmbedding, doc.embedding);
      }
      
      // 2. Score par mots-clés
      const contentLower = doc.content.toLowerCase();
      const titleLower = doc.metadata.title.toLowerCase();
      
      for (const word of queryWords) {
        // Titre : score élevé
        if (titleLower.includes(word)) keywordScore += 3;
        
        // Contenu : score basé sur la fréquence
        const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
        keywordScore += matches * 0.5;
        
        // Tags : score élevé
        if (doc.metadata.tags?.some(tag => tag.toLowerCase().includes(word))) {
          keywordScore += 2;
        }
        
        // Type de document
        if (doc.metadata.type.includes(word)) keywordScore += 1;
      }
      
      // Score combiné : 70% sémantique + 30% mots-clés
      const combinedScore = (semanticScore * 0.7) + (keywordScore * 0.3 / 10);
      
      if (combinedScore > 0.1) { // Seuil minimum
        results.push({ 
          doc, 
          score: combinedScore,
          semanticScore,
          keywordScore 
        });
      }
    }

    // Trier par score décroissant
    results.sort((a, b) => b.score - a.score);
    
    // Limiter les résultats
    const topResults = results.slice(0, nResults);
    
    console.log(`🔍 Recherche hybride : ${topResults.length} résultats trouvés`);
    topResults.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.doc.metadata.title} (score: ${r.score.toFixed(3)}, sem: ${r.semanticScore.toFixed(3)}, kw: ${r.keywordScore.toFixed(1)})`);
    });
    
    return {
      documents: topResults.map(r => r.doc.content),
      metadatas: topResults.map(r => r.doc.metadata),
      distances: topResults.map(r => 1 - r.score), // Convertir score en distance
    };
  }

  // Recherche de fallback par mots-clés uniquement
  private keywordOnlySearch(query: string, nResults: number): SearchResult {
    console.log('🔄 Recherche par mots-clés uniquement (fallback)');
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const results: { doc: Document; score: number }[] = [];

    for (const doc of this.documents) {
      let score = 0;
      const contentLower = doc.content.toLowerCase();
      const titleLower = doc.metadata.title.toLowerCase();
      
      for (const word of queryWords) {
        if (titleLower.includes(word)) score += 5;
        
        const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
        score += matches;
        
        if (doc.metadata.tags?.some(tag => tag.toLowerCase().includes(word))) {
          score += 3;
        }
      }
      
      if (score > 0) {
        results.push({ doc, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, nResults);
    
    return {
      documents: topResults.map(r => r.doc.content),
      metadatas: topResults.map(r => r.doc.metadata),
      distances: topResults.map(r => 1 - (r.score / 20)), // Normaliser
    };
  }

  // Ajouter des documents
  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('Base de données non initialisée');
    }

    console.log(`📥 Ajout de ${documents.length} documents...`);
    
    for (const doc of documents) {
      try {
        // Générer l'embedding pour le contenu
        doc.embedding = await this.generateEmbedding(doc.content);
        
        // Ajouter à la collection
        this.documents.push(doc);
        
        console.log(`✅ Document indexé: ${doc.id}`);
      } catch (error) {
        console.error(`❌ Erreur lors de l'indexation de ${doc.id}:`, error);
      }
    }

    console.log(`🎉 ${this.documents.length} documents au total dans la base`);
  }

  // Rechercher des documents similaires
  async search(query: string, nResults: number = 5): Promise<SearchResult> {
    if (!this.initialized) {
      throw new Error('Base de données non initialisée');
    }

    if (this.documents.length === 0) {
      console.log('⚠️ Aucun document dans la base');
      return { documents: [], metadatas: [], distances: [] };
    }

    console.log(`🔍 Recherche: "${query}"`);
    
    try {
      // Générer l'embedding de la requête
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Recherche hybride (embeddings + mots-clés)
      return this.hybridSearch(query, queryEmbedding, nResults);
      
    } catch (error) {
      console.error('❌ Erreur lors de la recherche sémantique:', error);
      
      // Fallback : recherche par mots-clés uniquement
      return this.keywordOnlySearch(query, nResults);
    }
  }

  // Obtenir le nombre de documents
  async getCount(): Promise<number> {
    return this.documents.length;
  }

  // Supprimer des documents
  async deleteDocuments(ids: string[]): Promise<void> {
    const initialCount = this.documents.length;
    this.documents = this.documents.filter(doc => !ids.includes(doc.id));
    const removedCount = initialCount - this.documents.length;
    
    console.log(`🗑️ ${removedCount} documents supprimés`);
  }

  // Obtenir des statistiques
  async getStats(): Promise<{ total: number; byType: Record<string, number> }> {
    const byType: Record<string, number> = {};
    
    for (const doc of this.documents) {
      byType[doc.metadata.type] = (byType[doc.metadata.type] || 0) + 1;
    }
    
    return {
      total: this.documents.length,
      byType
    };
  }

  // Vider la base
  async clear(): Promise<void> {
    this.documents = [];
    console.log('🧹 Base de données vidée');
  }
}

// Instance singleton
export const vectorDB = new SimpleVectorDatabase();