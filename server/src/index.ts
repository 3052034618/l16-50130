import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyMiddleware } from 'graphql-middleware';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { parse } from 'graphql';
import { Prisma } from '@prisma/client';
import { Role } from './config/permissions';

import { prisma, createContext, createSubscriptionContext } from './context';
import { generateGraphQLSchema } from './schema/generator';
import { generateResolvers } from './resolvers/generator';
import { relationResolvers } from './resolvers/relations';
import { authTypeDefs, createAuthResolvers } from './resolvers/auth';
import { adminTypeDefs, createAdminResolvers } from './resolvers/admin';
import { scalarResolvers } from './scalars';
import { createFieldPermissionMiddleware, filterResponseByPermissions, createResponseFilter } from './middleware/fieldPermission';
import { createQueryDepthLimitRule, assertQueryComplexity, calculateQueryComplexity } from './middleware/queryComplexity';
import { initRequestLogger, logRequest, shutdownLogger } from './middleware/requestLogger';
import { subscriptionManager } from './pubsub';

const PORT = parseInt(process.env.PORT || '4000', 10);
const MAX_QUERY_DEPTH = parseInt(process.env.MAX_QUERY_DEPTH || '10', 10);
const MAX_QUERY_COMPLEXITY = parseInt(process.env.MAX_QUERY_COMPLEXITY || '1000', 10);

async function main() {
  console.log('Starting GraphQL server...');

  const dmmf = Prisma.dmmf;
  
  const autoTypeDefs = generateGraphQLSchema(dmmf);
  const pubsub = subscriptionManager.getPubSub();
  const autoResolvers = generateResolvers(dmmf, pubsub);
  const authResolvers = createAuthResolvers(prisma);
  const adminResolvers = createAdminResolvers(prisma, dmmf);

  const typeDefs = [autoTypeDefs, authTypeDefs, adminTypeDefs];
  const resolvers = {
    ...autoResolvers,
    ...relationResolvers,
    Query: {
      ...autoResolvers.Query,
      ...authResolvers.Query,
      ...adminResolvers.Query,
    },
    Mutation: {
      ...autoResolvers.Mutation,
      ...authResolvers.Mutation,
      ...adminResolvers.Mutation,
    },
    Subscription: {
      ...autoResolvers.Subscription,
    },
    ...scalarResolvers,
  };

  let schema = makeExecutableSchema({ typeDefs, resolvers });

  const fieldPermissionMiddleware = createFieldPermissionMiddleware();
  schema = applyMiddleware(schema, fieldPermissionMiddleware);

  initRequestLogger(prisma);

  const app = express();
  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  subscriptionManager.setWebSocketServer(wsServer);

  const wsServerCleanup = useServer(
    {
      schema,
      context: (ctx, msg, args) => createSubscriptionContext(ctx, msg, args),
      onConnect: (ctx) => {
        console.log('WebSocket connected:', ctx.connectionId);
      },
      onDisconnect(ctx) {
        console.log('WebSocket disconnected:', ctx.connectionId);
      },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    validationRules: [
      createQueryDepthLimitRule(MAX_QUERY_DEPTH),
    ],
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await wsServerCleanup.dispose();
            },
          };
        },
      },
      {
        requestDidStart() {
          const startTime = Date.now();
          return {
            async didResolveOperation(requestContext: any) {
              const { document, request } = requestContext;
              const variables = request.variables;
              assertQueryComplexity(document, variables, MAX_QUERY_COMPLEXITY);
            },
            async willSendResponse(requestContext: any) {
              const { request, response, contextValue, document } = requestContext;
              const context = contextValue;
              const operationName = request.operationName || 'unknown';
              const query = request.query || '';
              const variables = request.variables;
              
              try {
                const complexity = calculateQueryComplexity(document || parse(query), variables);
                console.log(`[${operationName}] complexity: ${Math.round(complexity)}`);
              } catch (e) {}
              
              if (response.body?.singleResult?.data) {
                const userRole = context?.user?.role || Role.VIEWER;
                try {
                  const filterResponse = createResponseFilter(document);
                  response.body.singleResult.data = filterResponse(
                    response.body.singleResult.data,
                    userRole
                  );
                } catch (e) {
                  console.error('Error filtering response:', e);
                }
              }

              const errors = response.errors?.map((e: any) => ({
                message: e.message,
                path: e.path,
              }));

              const ipAddress = request.http?.headers.get('x-forwarded-for') || 
                               request.http?.headers.get('x-real-ip');
              const userAgent = request.http?.headers.get('user-agent');

              await logRequest(
                context,
                operationName,
                query,
                variables,
                response.body,
                errors,
                startTime,
                ipAddress as string | undefined,
                userAgent as string | undefined
              );
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      activeConnections: subscriptionManager.getActiveConnections(),
      totalSubscriptions: subscriptionManager.getTotalSubscriptions(),
    });
  });

  app.get('/api/schema', (_req, res) => {
    res.json({
      models: Prisma.dmmf.datamodel.models,
      enums: Prisma.dmmf.datamodel.enums,
    });
  });

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => createContext(req),
    })
  );

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 GraphQL Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🔔 WebSocket ready at ws://localhost:${PORT}/graphql`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`\nMax query depth: ${MAX_QUERY_DEPTH}`);
    console.log(`Max query complexity: ${MAX_QUERY_COMPLEXITY}`);
  });

  const gracefulShutdown = async () => {
    console.log('\nShutting down gracefully...');
    await shutdownLogger();
    subscriptionManager.shutdown();
    await server.stop();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

main().catch(async (error) => {
  console.error('Server failed to start:', error);
  await prisma.$disconnect();
  process.exit(1);
});
