import { GraphQLFieldResolver, GraphQLResolveInfo, DocumentNode, OperationDefinitionNode, SelectionSetNode, FieldNode, getOperationAST } from 'graphql';
import { GraphQLContext } from '../types';
import { canRead, Role } from '../config/permissions';

const MODEL_TYPE_MAP: Record<string, string> = {
  User: 'User',
  Profile: 'Profile',
  Post: 'Post',
  Comment: 'Comment',
  SavedQuery: 'SavedQuery',
  RequestLog: 'RequestLog',
  UserConnection: 'User',
  ProfileConnection: 'Profile',
  PostConnection: 'Post',
  CommentConnection: 'Comment',
  SavedQueryConnection: 'SavedQuery',
  RequestLogConnection: 'RequestLog',
};

const FIELD_RETURN_TYPE_MAP: Record<string, Record<string, string>> = {
  Query: {
    getUser: 'User',
    listUsers: 'UserConnection',
    countUsers: 'Int',
    getProfile: 'Profile',
    listProfiles: 'ProfileConnection',
    countProfiles: 'Int',
    getPost: 'Post',
    listPosts: 'PostConnection',
    countPosts: 'Int',
    getComment: 'Comment',
    listComments: 'CommentConnection',
    countComments: 'Int',
    getSavedQuery: 'SavedQuery',
    listSavedQueries: 'SavedQueryConnection',
    countSavedQueries: 'Int',
    getRequestLog: 'RequestLog',
    listRequestLogs: 'RequestLogConnection',
    countRequestLogs: 'Int',
    me: 'User',
    getSchemaInfo: 'SchemaInfo',
  },
  User: {
    posts: 'Post',
    comments: 'Comment',
    profile: 'Profile',
    savedQueries: 'SavedQuery',
    requestLogs: 'RequestLog',
  },
  Post: {
    author: 'User',
    comments: 'Comment',
  },
  Comment: {
    author: 'User',
    post: 'Post',
  },
  Profile: {
    user: 'User',
  },
  SavedQuery: {
    user: 'User',
  },
  RequestLog: {
    user: 'User',
  },
  PostConnection: {
    nodes: 'Post',
  },
  UserConnection: {
    nodes: 'User',
  },
  CommentConnection: {
    nodes: 'Comment',
  },
  ProfileConnection: {
    nodes: 'Profile',
  },
  SavedQueryConnection: {
    nodes: 'SavedQuery',
  },
  RequestLogConnection: {
    nodes: 'RequestLog',
  },
};

const getModelNameFromType = (typeName: string): string | null => {
  if (MODEL_TYPE_MAP[typeName]) {
    return MODEL_TYPE_MAP[typeName];
  }
  if (typeName.endsWith('Connection')) {
    return typeName.replace('Connection', '');
  }
  return null;
};

const getNestedModelName = (parentType: string, fieldName: string): string | null => {
  return FIELD_RETURN_TYPE_MAP[parentType]?.[fieldName] || null;
};

const filterObjectByPermissions = (
  obj: any,
  modelName: string,
  role: Role,
  visited: WeakSet<object> = new WeakSet()
): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== 'object') return obj;
  
  if (visited.has(obj)) return obj;
  visited.add(obj);
  
  if (Array.isArray(obj)) {
    return obj.map(item => filterObjectByPermissions(item, modelName, role, visited));
  }
  
  if (obj.nodes && Array.isArray(obj.nodes)) {
    const actualModelName = getModelNameFromType(modelName) || modelName;
    return {
      ...obj,
      nodes: obj.nodes.map((node: any) => 
        filterObjectByPermissions(node, actualModelName, role, visited)
      ),
    };
  }
  
  const filtered: any = {};
  const actualModelName = getModelNameFromType(modelName) || modelName;
  
  Object.keys(obj).forEach(key => {
    if (key === '__typename') {
      filtered[key] = obj[key];
      return;
    }
    
    if (!canRead(role, actualModelName, key)) {
      return;
    }
    
    let value = obj[key];
    
    if (value !== null && value !== undefined && typeof value === 'object') {
      try {
        const nestedModelName = getNestedModelName(actualModelName, key);
        
        if (nestedModelName) {
          value = filterObjectByPermissions(value, nestedModelName, role, visited);
        } else if (Array.isArray(value)) {
          value = value.map((item: any) => {
            if (item !== null && item !== undefined && typeof item === 'object') {
              const itemModelName = getNestedModelName(actualModelName, key);
              if (itemModelName) {
                return filterObjectByPermissions(item, itemModelName, role, visited);
              }
            }
            return item;
          });
        }
      } catch (e) {
        console.error('Error filtering nested object:', e);
      }
    }
    
    filtered[key] = value;
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
    const result = resolve(parent, args, context, info);
    return Promise.resolve(result).then((resolvedValue: any) => {
      if (resolvedValue === null || resolvedValue === undefined) {
        return resolvedValue;
      }
      
      const userRole = context?.user?.role || Role.VIEWER;
      const parentType = info.parentType.name;
      
      return filterObjectByPermissions(resolvedValue, parentType, userRole);
    });
  };
};

export const createResponseFilter = (document?: DocumentNode) => {
  return (data: any, role: Role) => {
    if (!document || !data) return data;
    
    const operation = getOperationAST(document);
    if (!operation || !operation.selectionSet) return data;
    
    const filtered: any = {};
    const operationType = operation.operation === 'mutation' ? 'Mutation' : 'Query';
    
    operation.selectionSet.selections.forEach(selection => {
      if (selection.kind === 'Field') {
        const responseKey = selection.alias?.value || selection.name.value;
        const fieldName = selection.name.value;
        const fieldType = FIELD_RETURN_TYPE_MAP[operationType]?.[fieldName];
        
        if (fieldType && data[responseKey] !== undefined) {
          filtered[responseKey] = filterObjectByPermissions(
            data[responseKey],
            fieldType,
            role,
            new WeakSet()
          );
        } else if (data[responseKey] !== undefined) {
          filtered[responseKey] = data[responseKey];
        }
      }
    });
    
    return filtered;
  };
};
