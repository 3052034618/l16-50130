import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../types';
import { canRead, Role } from '../config/permissions';

export const fieldPermissionMiddleware = (
  resolve: GraphQLFieldResolver<any, GraphQLContext>,
  parent: any,
  args: any,
  context: GraphQLContext,
  info: GraphQLResolveInfo
) => {
  const result = resolve(parent, args, context, info);
  return result.then((resolvedValue: any) => {
    if (!resolvedValue) return resolvedValue;
    
    const parentType = info.parentType.name;
    const userRole = context.user?.role || Role.VIEWER;
    
    return filterObjectByPermissions(resolvedValue, parentType, userRole);
  });
};

const filterObjectByPermissions = (obj: any, modelName: string, role: Role): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => filterObjectByPermissions(item, modelName, role));
  }
  
  if (typeof obj !== 'object') return obj;
  
  if (obj.nodes && Array.isArray(obj.nodes)) {
    return {
      ...obj,
      nodes: obj.nodes.map((node: any) => filterObjectByPermissions(node, modelName, role)),
    };
  }
  
  const filtered: any = {};
  Object.keys(obj).forEach(key => {
    if (canRead(role, modelName, key)) {
      filtered[key] = obj[key];
    }
  });
  
  return filtered;
};

export const createFieldPermissionMiddleware = () => {
  return async (
    resolve: GraphQLFieldResolver<any, GraphQLContext>,
    parent: any,
    args: any,
    context: GraphQLContext,
    info: GraphQLResolveInfo
  ) => {
    return fieldPermissionMiddleware(resolve, parent, args, context, info);
  };
};
