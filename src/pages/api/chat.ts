export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message requis' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Limiter la longueur du message
    if (message.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Message trop long (max 1000 caractères)' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Importer dynamiquement les modules
    const { ragRetriever } = await import('../../lib/rag/retrieval.js');
    // Valider l'historique
    const validHistory: any[] = Array.isArray(history) 
      ? history.filter(msg => 
          msg && 
          typeof msg.role === 'string' && 
          ['user', 'assistant'].includes(msg.role) &&
          typeof msg.content === 'string'
        ).slice(-10) // Limiter à 10 messages
      : [];

    // Générer la réponse
    const response = await ragRetriever.generateResponse(message, validHistory);

    return new Response(
      JSON.stringify({
        success: true,
        data: response
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erreur API chat:', error);
    
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

// Options pour la méthode preflight CORS
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
};