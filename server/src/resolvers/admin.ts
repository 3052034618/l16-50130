import { PrismaClient } from '@prisma/client';
import { GraphQLContext } from '../types';
import { Role, permissions } from '../config/permissions';
import { gql } from 'graphql-tag';
import {
  transformSavedQuery,
  transformSavedQueryCreateInput,
  transformRequestLog,
  transformList,
} from '../utils/transform';

export const adminTypeDefs = gql`
  extend type Query {
    getSchemaInfo: SchemaInfo!
    listRequestLogs(
      page: Int = 1
      pageSize: Int = 20
      operation: String
    ): RequestLogConnection!
    listSavedQueries: [SavedQuery!]!
  }

  extend type Mutation {
    saveQuery(name: String!, description: String, query: String!, variables: JSON): SavedQuery!
    deleteSavedQuery(id: Int!): SavedQuery!
  }

  type SchemaInfo {
    models: [ModelInfo!]!
    queries: [FieldInfo!]!
    mutations: [FieldInfo!]!
    subscriptions: [FieldInfo!]!
  }

  type ModelInfo {
    name: String!
    fields: [FieldInfo!]!
  }

  type FieldInfo {
    name: String!
    type: String!
    isList: Boolean!
    isRequired: Boolean!
    description: String
  }

  type RequestLogConnection {
    nodes: [RequestLog!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }
`;

export const createAdminResolvers = (prisma: PrismaClient, dmmf: any) => ({
  Query: {
    getSchemaInfo: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user || context.user.role !== Role.ADMIN) {
        throw new Error('Admin privileges required');
      }

      const models = dmmf.datamodel.models.map((model: any) => ({
        name: model.name,
        fields: model.fields.map((field: any) => ({
          name: field.name,
          type: field.type,
          isList: field.isList,
          isRequired: field.isRequired,
          description: getFieldDescription(model.name, field.name),
        })),
      }));

      const queries = Object.keys({}).map(name => ({
        name,
        type: 'Query',
        isList: false,
        isRequired: true,
      }));

      return {
        models,
        queries: [],
        mutations: [],
        subscriptions: [],
      };
    },

    listRequestLogs: async (
      _: any,
      { page = 1, pageSize = 20, operation }: any,
      context: GraphQLContext
    ) => {
      if (!context.user || context.user.role !== Role.ADMIN) {
        throw new Error('Admin privileges required');
      }

      const skip = (page - 1) * pageSize;
      const where: any = {};
      if (operation) {
        where.operation = { contains: operation };
      }

      const [nodes, total] = await Promise.all([
        prisma.requestLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.requestLog.count({ where }),
      ]);

      return {
        nodes: transformList(nodes, transformRequestLog),
        total,
        page,
        pageSize,
      };
    },

    listSavedQueries: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const result = await prisma.savedQuery.findMany({
        where: { userId: context.user.id },
        orderBy: { updatedAt: 'desc' },
      });
      return transformList(result, transformSavedQuery);
    },
  },

  Mutation: {
    saveQuery: async (
      _: any,
      { name, description, query, variables }: any,
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const data = transformSavedQueryCreateInput({
        name,
        description,
        query,
        variables,
        userId: context.user.id,
      });
      const result = await prisma.savedQuery.create({ data });
      return transformSavedQuery(result);
    },

    deleteSavedQuery: async (
      _: any,
      { id }: any,
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const savedQuery = await prisma.savedQuery.findUnique({ where: { id } });
      if (!savedQuery) {
        throw new Error('Saved query not found');
      }
      if (savedQuery.userId !== context.user.id && context.user.role !== Role.ADMIN) {
        throw new Error('Permission denied');
      }

      const result = await prisma.savedQuery.delete({ where: { id } });
      return transformSavedQuery(result);
    },
  },
});

const getFieldDescription = (modelName: string, fieldName: string): string => {
  const modelPerms = permissions[modelName];
  if (!modelPerms) return '';
  const fieldPerms = modelPerms[fieldName];
  if (!fieldPerms) return '';
  
  const readRoles = fieldPerms.read.join(', ');
  const writeRoles = fieldPerms.write.join(', ');
  return `Read: [${readRoles}], Write: [${writeRoles}]`;
};
