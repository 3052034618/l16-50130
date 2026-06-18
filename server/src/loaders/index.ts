import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';
import {
  transformPost,
  transformSavedQuery,
  transformRequestLog,
  transformList,
} from '../utils/transform';

export const createLoaders = (prisma: PrismaClient) => {
  const createBatchLoader = (
    model: keyof PrismaClient,
    transformFn?: (item: any) => any
  ) => {
    return new DataLoader<number, any>(async (ids: readonly number[]) => {
      const uniqueIds = [...new Set(ids as number[])];
      let results = await (prisma[model] as any).findMany({
        where: { id: { in: uniqueIds } },
      });
      if (transformFn) {
        results = results.map(transformFn);
      }
      const resultMap = new Map(results.map((r: any) => [r.id, r]));
      return ids.map((id: number) => resultMap.get(id) || null);
    });
  };

  const createBatchRelationLoader = (
    model: keyof PrismaClient,
    relationField: string,
    transformFn?: (item: any) => any
  ) => {
    return new DataLoader<number, any[]>(async (ids: readonly number[]) => {
      const uniqueIds = [...new Set(ids as number[])];
      let results = await (prisma[model] as any).findMany({
        where: { [relationField]: { in: uniqueIds } },
      });
      if (transformFn) {
        results = transformList(results, transformFn);
      }
      const resultMap = new Map<number, any[]>();
      uniqueIds.forEach(id => resultMap.set(id, []));
      results.forEach((r: any) => {
        const key = r[relationField];
        resultMap.get(key)?.push(r);
      });
      return ids.map((id: number) => resultMap.get(id) || []);
    });
  };

  return {
    user: createBatchLoader('user'),
    profile: createBatchLoader('profile'),
    post: createBatchLoader('post', transformPost),
    comment: createBatchLoader('comment'),
    savedQuery: createBatchLoader('savedQuery', transformSavedQuery),
    requestLog: createBatchLoader('requestLog', transformRequestLog),
    postsByAuthorId: createBatchRelationLoader('post', 'authorId', transformPost),
    commentsByPostId: createBatchRelationLoader('comment', 'postId'),
    commentsByAuthorId: createBatchRelationLoader('comment', 'authorId'),
    profileByUserId: new DataLoader<number, any>(async (ids: readonly number[]) => {
      const uniqueIds = [...new Set(ids as number[])];
      const results = await prisma.profile.findMany({
        where: { userId: { in: uniqueIds } },
      });
      const resultMap = new Map(results.map((r: any) => [r.userId, r]));
      return ids.map((id: number) => resultMap.get(id) || null);
    }),
  };
};

export type Loaders = ReturnType<typeof createLoaders>;
