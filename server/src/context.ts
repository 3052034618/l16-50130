import { PrismaClient } from '@prisma/client';
import { createLoaders } from './loaders';
import { verifyToken, extractTokenFromRequest, extractTokenFromConnectionParams } from './auth';
import { GraphQLContext } from './types';
import { subscriptionManager } from './pubsub';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export const createContext = (req: any): GraphQLContext => {
  const token = extractTokenFromRequest(req);
  const user = token ? verifyToken(token) : null;
  const loaders = createLoaders(prisma);

  return {
    prisma,
    user,
    loaders,
    pubsub: subscriptionManager.getPubSub(),
  };
};

export const createSubscriptionContext = (ctx: any, msg: any, args: any): GraphQLContext => {
  const token = extractTokenFromConnectionParams(ctx.connectionParams);
  const user = token ? verifyToken(token) : null;
  const loaders = createLoaders(prisma);
  const connectionId = ctx.connectionId || args?.connectionId;

  return {
    prisma,
    user,
    loaders,
    pubsub: subscriptionManager.getPubSub(),
    connectionId,
  };
};

export { prisma };
