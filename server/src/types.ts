import { PrismaClient } from '@prisma/client';
import DataLoader from 'dataloader';
import { Role } from './config/permissions';

export interface UserContext {
  id: number;
  username: string;
  role: Role;
}

export interface GraphQLContext {
  prisma: PrismaClient;
  user: UserContext | null;
  loaders: {
    [key: string]: DataLoader<number, any>;
  };
  pubsub: any;
  connectionId?: string;
}

export interface FieldPermission {
  read: Role[];
  write: Role[];
}

export interface ModelPermissions {
  [field: string]: FieldPermission;
}

export interface PermissionsConfig {
  [model: string]: ModelPermissions;
}

export interface QueryComplexityRule {
  maxDepth: number;
  maxComplexity: number;
}

export interface PrismaModelField {
  name: string;
  kind: string;
  type: string;
  isId?: boolean;
  isRequired: boolean;
  isList: boolean;
  isUnique?: boolean;
  default?: any;
  relationName?: string;
  relationToFields?: string[];
  relationFromFields?: string[];
}

export interface PrismaModel {
  name: string;
  fields: PrismaModelField[];
}
