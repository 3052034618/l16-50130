import { DMMF } from '@prisma/client/runtime/library';
import { GraphQLContext } from '../types';
import { canWrite, Role } from '../config/permissions';
import {
  transformPost,
  transformPostCreateInput,
  transformSavedQuery,
  transformSavedQueryCreateInput,
  transformRequestLog,
  transformRequestLogCreateInput,
  transformConnection,
} from '../utils/transform';

const getTransformers = (modelName: string) => {
  switch (modelName) {
    case 'Post':
      return {
        transform: transformPost,
        transformInput: transformPostCreateInput,
      };
    case 'SavedQuery':
      return {
        transform: transformSavedQuery,
        transformInput: transformSavedQueryCreateInput,
      };
    case 'RequestLog':
      return {
        transform: transformRequestLog,
        transformInput: transformRequestLogCreateInput,
      };
    default:
      return {
        transform: (x: any) => x,
        transformInput: (x: any) => x,
      };
  }
};

export const generateResolvers = (dmmf: DMMF.Document, pubsub: any) => {
  const models = dmmf.datamodel.models;
  const resolvers: any = {
    Query: {},
    Mutation: {},
    Subscription: {},
  };

  models.forEach((model: any) => {
    const modelName = model.name;
    const camelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const prismaModel = camelName as keyof typeof import('@prisma/client').PrismaClient;
    const { transform, transformInput } = getTransformers(modelName);

    resolvers.Query[`get${modelName}`] = async (
      _: any,
      { id }: { id: number },
      context: GraphQLContext
    ) => {
      let result;
      const loader = context.loaders[camelName];
      if (loader) {
        result = await loader.load(id);
      } else {
        result = await (context.prisma[prismaModel] as any).findUnique({ where: { id } });
      }
      return transform(result);
    };

    resolvers.Query[`list${modelName}s`] = async (
      _: any,
      { where, orderBy, page = 1, pageSize = 10 }: any,
      context: GraphQLContext
    ) => {
      const skip = (page - 1) * pageSize;
      const prismaWhere = where ? buildWhereClause(where) : {};
      const prismaOrderBy = orderBy ? { [orderBy.field]: orderBy.direction } : { id: 'asc' };

      const [nodes, total] = await Promise.all([
        (context.prisma[prismaModel] as any).findMany({
          where: prismaWhere,
          orderBy: prismaOrderBy,
          skip,
          take: pageSize,
        }),
        (context.prisma[prismaModel] as any).count({ where: prismaWhere }),
      ]);

      return transformConnection({ nodes, total, page, pageSize }, transform);
    };

    resolvers.Query[`count${modelName}s`] = async (
      _: any,
      { where }: any,
      context: GraphQLContext
    ) => {
      const prismaWhere = where ? buildWhereClause(where) : {};
      return (context.prisma[prismaModel] as any).count({ where: prismaWhere });
    };

    resolvers.Mutation[`create${modelName}`] = async (
      _: any,
      { data }: any,
      context: GraphQLContext
    ) => {
      const userRole = context.user?.role || Role.VIEWER;
      let filteredData = filterInputData(data, modelName, userRole);
      filteredData = transformInput(filteredData);
      
      let result = await (context.prisma[prismaModel] as any).create({ data: filteredData });
      result = transform(result);
      pubsub.publish(`${camelName}Created`, { [`${camelName}Created`]: result });
      return result;
    };

    resolvers.Mutation[`update${modelName}`] = async (
      _: any,
      { id, data }: any,
      context: GraphQLContext
    ) => {
      const userRole = context.user?.role || Role.VIEWER;
      let filteredData = filterInputData(data, modelName, userRole);
      filteredData = transformInput(filteredData);
      
      let result = await (context.prisma[prismaModel] as any).update({
        where: { id },
        data: filteredData,
      });
      result = transform(result);
      pubsub.publish(`${camelName}Updated`, { [`${camelName}Updated`]: result, id });
      return result;
    };

    resolvers.Mutation[`delete${modelName}`] = async (
      _: any,
      { id }: any,
      context: GraphQLContext
    ) => {
      let result = await (context.prisma[prismaModel] as any).delete({ where: { id } });
      result = transform(result);
      pubsub.publish(`${camelName}Deleted`, { [`${camelName}Deleted`]: id, id });
      return result;
    };

    resolvers.Subscription[`${camelName}Created`] = {
      subscribe: () => pubsub.asyncIterator([`${camelName}Created`]),
    };

    resolvers.Subscription[`${camelName}Updated`] = {
      subscribe: (payload: any, variables: any) => {
        return {
          [Symbol.asyncIterator]: () => ({
            next: async () => {
              const asyncIterator = pubsub.asyncIterator([`${camelName}Updated`]);
              const result = await asyncIterator.next();
              if (variables.id && result.value[`${camelName}Updated`].id !== variables.id) {
                return { value: null, done: false };
              }
              return result;
            },
            return: async () => {
              return { value: null, done: true };
            },
          }),
        };
      },
    };

    resolvers.Subscription[`${camelName}Deleted`] = {
      subscribe: (payload: any, variables: any) => {
        return {
          [Symbol.asyncIterator]: () => ({
            next: async () => {
              const asyncIterator = pubsub.asyncIterator([`${camelName}Deleted`]);
              const result = await asyncIterator.next();
              if (variables.id && result.value[`${camelName}Deleted`] !== variables.id) {
                return { value: null, done: false };
              }
              return result;
            },
            return: async () => {
              return { value: null, done: true };
            },
          }),
        };
      },
    };
  });

  return resolvers;
};

const buildWhereClause = (where: any): any => {
  const result: any = {};
  Object.entries(where).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  });
  return result;
};

const filterInputData = (data: any, modelName: string, role: Role): any => {
  const filtered: any = {};
  Object.entries(data).forEach(([key, value]) => {
    if (canWrite(role, modelName, key)) {
      filtered[key] = value;
    }
  });
  return filtered;
};
