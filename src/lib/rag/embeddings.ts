import { getCollection } from 'astro:content';
import fs from 'fs/promises';
import path from 'path';
import { vectorDB, type Document } from './simple-vectordb.js';

export class DocumentProcessor {
  
  // Traiter le contenu du portfolio (projets, expériences, etc.)
  async processPortfolioContent(): Promise<Document[]> {
    const documents: Document[] = [];
    
    try {
      // Récupérer tous les projets
      const workCollection = await getCollection('work');
      
      for (const work of workCollection) {
        const { data, body } = work;
        
        // Document principal du projet
        documents.push({
          id: `project_${work.slug}`,
          content: `${data.title}\n\n${data.description}\n\n${body}`,
          metadata: {
            title: data.title,
            type: 'project',
            source: `work/${work.slug}`,
            tags: data.tags || [],
            publishDate: data.publishDate?.toISOString() || '',
          }
        });

        // Documents séparés pour les compétences/tags
        if (data.tags && data.tags.length > 0) {
          documents.push({
            id: `project_skills_${work.slug}`,
            content: `Projet: ${data.title}. Compétences utilisées: ${data.tags.join(', ')}. Description: ${data.description}`,
            metadata: {
              title: `Compétences - ${data.title}`,
              type: 'skill',
              source: `work/${work.slug}`,
              tags: data.tags,
            }
          });
        }
      }

      // Ajouter les données d'expérience codées en dur (du HeroSection et ExperienceTimeline)
      documents.push({
        id: 'experience_iveco',
        content: `AI Engineer chez IVECO GROUP (2023-2024). Développement d'un générateur de données synthétiques pour les tests de conduite autonome. Technologies: Python, LangChain, OLLAMA, ChromaDB, RAG, LLM. Amélioration de 30% de la couverture de tests.`,
        metadata: {
          title: 'AI Engineer - IVECO GROUP',
          type: 'experience',
          source: 'experience',
          tags: ['Python', 'LangChain', 'OLLAMA', 'ChromaDB', 'RAG', 'LLM'],
        }
      });

      documents.push({
        id: 'experience_chu',
        content: `Data Scientist Stagiaire au CHU de Lille (2023). Analyse prédictive sur données de santé mentale. Technologies: R, Shiny, SQL, Machine Learning. Développement de modèles prédictifs pour identifier les risques.`,
        metadata: {
          title: 'Data Scientist - CHU de Lille',
          type: 'experience',
          source: 'experience',
          tags: ['R', 'Shiny', 'SQL', 'Machine Learning', 'Healthcare'],
        }
      });

      documents.push({
        id: 'experience_eric',
        content: `Analyste de données au Laboratoire ERIC (2022). Recherche en IA appliquée aux données de transport. Technologies: Python, Pandas, Scikit-learn. Publication d'articles scientifiques.`,
        metadata: {
          title: 'Analyste de données - Laboratoire ERIC',
          type: 'experience',
          source: 'experience',
          tags: ['Python', 'Pandas', 'Scikit-learn', 'Research'],
        }
      });

      // Ajouter les compétences techniques
      const skills = [
        'Python, JavaScript, TypeScript, R, SQL',
        'PyTorch, TensorFlow, Scikit-learn, Pandas, NumPy',
        'LangChain, OLLAMA, ChromaDB, Mistral AI, OpenAI',
        'RAG (Retrieval-Augmented Generation), LLM, Deep Learning',
        'Docker, Git, AWS, Azure, Linux',
        'React, Astro, Tailwind CSS, Node.js'
      ];

      skills.forEach((skillGroup, index) => {
        documents.push({
          id: `skills_${index}`,
          content: `Compétences techniques de Solim LAOKPEZI: ${skillGroup}`,
          metadata: {
            title: `Compétences techniques - Groupe ${index + 1}`,
            type: 'skill',
            source: 'skills',
          }
        });
      });

      // Ajouter les certifications
      documents.push({
        id: 'certifications',
        content: `Certifications Microsoft Azure de Solim LAOKPEZI: Azure Fundamentals (AZ-900), Azure Data Fundamentals (DP-900), Azure AI Fundamentals (AI-900). Formation en intelligence artificielle et cloud computing.`,
        metadata: {
          title: 'Certifications Microsoft Azure',
          type: 'certification',
          source: 'certifications',
          tags: ['Azure', 'Microsoft', 'Cloud', 'AI'],
        }
      });

      console.log(`${documents.length} documents de portfolio traités`);
      return documents;
      
    } catch (error) {
      console.error('Erreur lors du traitement du contenu portfolio:', error);
      return [];
    }
  }

  // Traiter les documents PDF
  async processPDFDocuments(): Promise<Document[]> {
    const documents: Document[] = [];
    const documentsPath = path.join(process.cwd(), 'public', 'documents');
    
    try {
      // Vérifier si le dossier documents existe
      const stat = await fs.stat(documentsPath);
      if (!stat.isDirectory()) {
        console.log('Dossier documents non trouvé, ignoré');
        return documents;
      }

      const files = await fs.readdir(documentsPath);
      const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
      
      if (pdfFiles.length === 0) {
        console.log('Aucun fichier PDF trouvé dans le dossier documents');
        return documents;
      }

      // Importer pdf-parse dynamiquement pour éviter les problèmes d'initialisation
      const pdfParse = await import('pdf-parse');
      const pdf = pdfParse.default as any;
      
      for (const pdfFile of pdfFiles) {
        try {
          const filePath = path.join(documentsPath, pdfFile);
          const buffer = await fs.readFile(filePath);
          const data = await pdf(buffer);
          
          // Nettoyer le texte extrait
          const cleanText = data.text
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();

          if (cleanText.length > 0) {
            // Diviser en chunks si le document est très long
            const chunks = this.chunkText(cleanText, 1000, 200);
            
            chunks.forEach((chunk, index) => {
              documents.push({
                id: `pdf_${pdfFile}_chunk_${index}`,
                content: chunk,
                metadata: {
                  title: `${pdfFile} - Partie ${index + 1}`,
                  type: 'pdf',
                  source: `documents/${pdfFile}`,
                  url: `/documents/${pdfFile}`,
                }
              });
            });

            console.log(`PDF ${pdfFile} traité: ${chunks.length} chunks créés`);
          } else {
            console.log(`PDF ${pdfFile} semble vide, ignoré`);
          }
          
        } catch (error) {
          console.error(`Erreur lors du traitement de ${pdfFile}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la lecture du dossier documents:', error);
    }
    
    return documents;
  }

  // Diviser le texte en chunks avec chevauchement
  private chunkText(text: string, maxLength: number, overlap: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split('. ');
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Ajouter le chevauchement
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 6)); // Approximation
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  // Indexer tout le contenu
  async indexAllContent(): Promise<void> {
    try {
      console.log('Début de l\'indexation...');
      
      // Initialiser la base vectorielle
      await vectorDB.initialize();
      
      // Traiter le contenu du portfolio
      const portfolioDocuments = await this.processPortfolioContent();
      
      // Traiter les documents PDF
      const pdfDocuments = await this.processPDFDocuments();
      
      // Combiner tous les documents
      const allDocuments = [...portfolioDocuments, ...pdfDocuments];
      
      if (allDocuments.length > 0) {
        // Ajouter à la base vectorielle
        await vectorDB.addDocuments(allDocuments);
        console.log(`Indexation terminée: ${allDocuments.length} documents indexés`);
      } else {
        console.log('Aucun document à indexer');
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'indexation:', error);
      throw error;
    }
  }
}

export const documentProcessor = new DocumentProcessor();