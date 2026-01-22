import type { PrismaClient, ArticleCategory } from '@prisma/client';

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: ArticleCategory;
  order: number;
  isPublished: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticlesByCategory {
  category: ArticleCategory;
  articles: HelpArticle[];
}

export class HelpService {
  constructor(private prisma: PrismaClient) {}

  async listArticles(category?: ArticleCategory): Promise<HelpArticle[]> {
    const where: Record<string, unknown> = { isPublished: true };
    if (category) where.category = category;

    return this.prisma.helpArticle.findMany({
      where,
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { title: 'asc' }],
    });
  }

  async listArticlesByCategory(): Promise<ArticlesByCategory[]> {
    const articles = await this.prisma.helpArticle.findMany({
      where: { isPublished: true },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });

    // Group by category
    const categories: ArticleCategory[] = [
      'GETTING_STARTED',
      'PATIENTS',
      'SCHEDULING',
      'FINANCIAL',
      'CLINICAL',
      'SETTINGS',
      'FAQ',
    ];

    return categories.map((category) => ({
      category,
      articles: articles.filter((a) => a.category === category),
    }));
  }

  async getArticle(slug: string): Promise<HelpArticle | null> {
    return this.prisma.helpArticle.findFirst({
      where: { slug, isPublished: true },
    });
  }

  async searchArticles(query: string): Promise<HelpArticle[]> {
    return this.prisma.helpArticle.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { viewCount: 'desc' },
      take: 20,
    });
  }

  async incrementViewCount(slug: string): Promise<void> {
    await this.prisma.helpArticle.updateMany({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });
  }

  // Admin methods for managing articles (if needed)
  async createArticle(data: Omit<HelpArticle, 'id' | 'viewCount' | 'createdAt' | 'updatedAt'>): Promise<HelpArticle> {
    return this.prisma.helpArticle.create({
      data: {
        ...data,
        viewCount: 0,
      },
    });
  }

  async updateArticle(id: string, data: Partial<HelpArticle>): Promise<HelpArticle | null> {
    const existing = await this.prisma.helpArticle.findUnique({ where: { id } });
    if (!existing) return null;

    return this.prisma.helpArticle.update({
      where: { id },
      data,
    });
  }

  async deleteArticle(id: string): Promise<boolean> {
    const existing = await this.prisma.helpArticle.findUnique({ where: { id } });
    if (!existing) return false;

    await this.prisma.helpArticle.delete({ where: { id } });
    return true;
  }
}
