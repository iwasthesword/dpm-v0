import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../common/middleware/authenticate.js';
import { HelpService } from './help.service.js';
import type { ArticleCategory } from '@prisma/client';

export async function helpRoutes(fastify: FastifyInstance) {
  const helpService = new HelpService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // List all articles (optionally by category)
  fastify.get<{
    Querystring: { category?: ArticleCategory };
  }>('/articles', async (request, reply) => {
    const { category } = request.query;
    const articles = await helpService.listArticles(category);
    return reply.send({ success: true, articles });
  });

  // List articles grouped by category
  fastify.get('/articles/by-category', async (request, reply) => {
    const categories = await helpService.listArticlesByCategory();
    return reply.send({ success: true, categories });
  });

  // Search articles
  fastify.get<{
    Querystring: { q: string };
  }>('/articles/search', async (request, reply) => {
    const { q } = request.query;
    if (!q || q.length < 2) {
      return reply.send({ success: true, articles: [] });
    }
    const articles = await helpService.searchArticles(q);
    return reply.send({ success: true, articles });
  });

  // Get single article by slug
  fastify.get<{
    Params: { slug: string };
  }>('/articles/:slug', async (request, reply) => {
    const article = await helpService.getArticle(request.params.slug);

    if (!article) {
      return reply.status(404).send({ success: false, error: 'Article not found' });
    }

    return reply.send({ success: true, article });
  });

  // Increment view count
  fastify.post<{
    Params: { slug: string };
  }>('/articles/:slug/view', async (request, reply) => {
    await helpService.incrementViewCount(request.params.slug);
    return reply.send({ success: true });
  });
}
