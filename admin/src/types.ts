export interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'USER' | 'VIEWER';
  createdAt: string;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface RequestLog {
  id: number;
  operation: string;
  query: string;
  variables: any;
  result: any;
  errors: any;
  duration: number;
  userId: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface SavedQuery {
  id: number;
  name: string;
  description: string | null;
  query: string;
  variables: any;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModelField {
  name: string;
  type: string;
  isList: boolean;
  isRequired: boolean;
  description: string;
}

export interface ModelInfo {
  name: string;
  fields: ModelField[];
}

export interface SchemaInfo {
  models: ModelInfo[];
  queries: ModelField[];
  mutations: ModelField[];
  subscriptions: ModelField[];
}
