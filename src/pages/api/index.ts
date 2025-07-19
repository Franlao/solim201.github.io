export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { action = 'index', force = false } = await request.json();

    // Import dynamiquement les modules pour éviter les erreurs
    const { documentProcessor } = await import('../../lib/rag/embeddings.js');
    const { vectorDB } = await import('../../lib/rag/simple-vectordb.js');

    switch (action) {
      case 'index':
        // Vérifier si l'indexation est déjà faite (sauf si force=true)
        if (!force) {
          const count = await vectorDB.getCount();
          if (count > 0) {
            return new Response(
              JSON.stringify({ 
                success: true,
                message: `Base déjà indexée avec ${count} documents. Utilisez force=true pour réindexer.`,
                count 
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
        }

        // Indexer tout le contenu
        await documentProcessor.indexAllContent();
        const finalCount = await vectorDB.getCount();

        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Indexation terminée avec succès`,
            count: finalCount
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );

      case 'status':
        const statusCount = await vectorDB.getCount();
        return new Response(
          JSON.stringify({ 
            success: true,
            indexed: statusCount > 0,
            count: statusCount
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );

      case 'reset':
        // Réinitialiser la base (développement seulement)
        if (import.meta.env.PROD) {
          return new Response(
            JSON.stringify({ error: 'Action non autorisée en production' }),
            { 
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        // TODO: Implémenter la réinitialisation si nécessaire
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Base réinitialisée (feature à implémenter)'
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Action non reconnue' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
    }

  } catch (error) {
    console.error('Erreur API index:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de l\'indexation',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        success: false 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const GET: APIRoute = async () => {
  try {
    const { vectorDB } = await import('../../lib/rag/simple-vectordb.js');
    const count = await vectorDB.getCount();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        indexed: count > 0,
        count,
        status: 'API opérationnelle'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Erreur GET API index:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la vérification du statut',
        success: false 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};