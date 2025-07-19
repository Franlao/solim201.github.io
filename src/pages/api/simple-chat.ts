export const prerender = false;

import type { APIRoute } from 'astro';

// Réponses prédéfinies simples pour tester l'interface
const responses = {
  "solim": "Je suis Solim LAOKPEZI, AI Engineer et Data Scientist avec 2+ ans d'expérience. Je me spécialise en IA générative, LLM, RAG et Deep Learning.",
  "experience": "J'ai travaillé chez IVECO GROUP comme AI Engineer, au CHU de Lille comme Data Scientist, et au Laboratoire ERIC comme Analyste de données.",
  "projets": "Mes principaux projets incluent un générateur de données synthétiques chez IVECO, des analyses prédictives en santé mentale au CHU, et des recherches en IA au laboratoire ERIC.",
  "competences": "Mes compétences incluent Python, JavaScript, PyTorch, LangChain, OLLAMA, ChromaDB, Mistral AI, React, et bien d'autres technologies IA.",
  "certifications": "J'ai obtenu 3 certifications Microsoft Azure : AZ-900 (Azure Fundamentals), DP-900 (Data Fundamentals), et AI-900 (AI Fundamentals).",
  "default": "C'est une excellente question ! Je peux vous parler de mon expérience chez IVECO, mes projets en IA, mes compétences techniques, ou mes certifications. Que souhaitez-vous savoir ?"
};

function getResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('solim') || lowerMessage.includes('qui es')) {
    return responses.solim;
  } else if (lowerMessage.includes('experience') || lowerMessage.includes('travail') || lowerMessage.includes('iveco') || lowerMessage.includes('chu')) {
    return responses.experience;
  } else if (lowerMessage.includes('projet') || lowerMessage.includes('réalisation')) {
    return responses.projets;
  } else if (lowerMessage.includes('compétence') || lowerMessage.includes('technologie') || lowerMessage.includes('python') || lowerMessage.includes('ia')) {
    return responses.competences;
  } else if (lowerMessage.includes('certification') || lowerMessage.includes('azure') || lowerMessage.includes('diplome')) {
    return responses.certifications;
  } else {
    return responses.default;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message requis' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Simuler un délai de traitement
    await new Promise(resolve => setTimeout(resolve, 500));

    const answer = getResponse(message);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          answer,
          sources: ["Portfolio Solim LAOKPEZI"],
          confidence: 0.95
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erreur API simple-chat:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        success: false 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};