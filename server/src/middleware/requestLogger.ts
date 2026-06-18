import { PrismaClient } from '@prisma/client';
import { GraphQLContext } from '../types';
import { transformRequestLogCreateInput } from '../utils/transform';

let requestLogQueue: Array<{
  operation: string;
  query: string;
  variables: any;
  result: any;
  errors: any;
  duration: number;
  userId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
}> = [];

let flushInterval: NodeJS.Timeout | null = null;
let prismaInstance: PrismaClient | null = null;

export const initRequestLogger = (prisma: PrismaClient) => {
  prismaInstance = prisma;
  if (flushInterval) clearInterval(flushInterval);
  flushInterval = setInterval(flushLogs, 5000);
};

const flushLogs = async () => {
  if (!prismaInstance || requestLogQueue.length === 0) return;
  
  const logsToFlush = [...requestLogQueue];
  requestLogQueue = [];
  
  try {
    await prismaInstance.requestLog.createMany({
      data: logsToFlush.map(log => transformRequestLogCreateInput({
        operation: log.operation,
        query: log.query,
        variables: log.variables,
        result: log.result,
        errors: log.errors,
        duration: log.duration,
        userId: log.userId,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      })),
    });
  } catch (error) {
    console.error('Failed to flush request logs:', error);
    requestLogQueue = [...logsToFlush, ...requestLogQueue].slice(-1000);
  }
};

export const logRequest = async (
  context: GraphQLContext,
  operationName: string,
  query: string,
  variables: any,
  result: any,
  errors: any,
  startTime: number,
  ipAddress?: string,
  userAgent?: string
) => {
  const duration = Date.now() - startTime;
  
  const truncatedQuery = query.substring(0, 5000);
  const sanitizedResult = result ? JSON.parse(JSON.stringify(result)) : null;
  
  requestLogQueue.push({
    operation: operationName || 'unknown',
    query: truncatedQuery,
    variables: variables || null,
    result: sanitizedResult,
    errors: errors || null,
    duration,
    userId: context.user?.id || null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });
  
  if (requestLogQueue.length > 100) {
    await flushLogs();
  }
};

export const shutdownLogger = async () => {
  if (flushInterval) clearInterval(flushInterval);
  await flushLogs();
};
