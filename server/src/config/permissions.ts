import { PermissionsConfig } from '../types';

export const Role = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  USER: 'USER',
  VIEWER: 'VIEWER',
} as const;

export type Role = typeof Role[keyof typeof Role];

const ALL_ROLES = [Role.ADMIN, Role.EDITOR, Role.USER, Role.VIEWER];
const ADMIN_ONLY = [Role.ADMIN];
const ADMIN_EDITOR = [Role.ADMIN, Role.EDITOR];
const ADMIN_EDITOR_USER = [Role.ADMIN, Role.EDITOR, Role.USER];
const AUTHENTICATED = [Role.ADMIN, Role.EDITOR, Role.USER];

export const permissions: PermissionsConfig = {
  User: {
    id: { read: ALL_ROLES, write: ADMIN_ONLY },
    username: { read: ALL_ROLES, write: ADMIN_EDITOR_USER },
    email: { read: ADMIN_ONLY, write: ADMIN_EDITOR_USER },
    password: { read: ADMIN_ONLY, write: ADMIN_EDITOR_USER },
    role: { read: ADMIN_ONLY, write: ADMIN_ONLY },
    createdAt: { read: ALL_ROLES, write: [] },
    updatedAt: { read: ALL_ROLES, write: [] },
    posts: { read: ALL_ROLES, write: [] },
    comments: { read: ALL_ROLES, write: [] },
    profile: { read: ALL_ROLES, write: [] },
  },
  Profile: {
    id: { read: ALL_ROLES, write: [] },
    bio: { read: ALL_ROLES, write: AUTHENTICATED },
    avatar: { read: ALL_ROLES, write: AUTHENTICATED },
    location: { read: ADMIN_EDITOR, write: AUTHENTICATED },
    website: { read: ALL_ROLES, write: AUTHENTICATED },
    phone: { read: ADMIN_ONLY, write: AUTHENTICATED },
    userId: { read: ALL_ROLES, write: ADMIN_ONLY },
    user: { read: ALL_ROLES, write: [] },
    createdAt: { read: ALL_ROLES, write: [] },
    updatedAt: { read: ALL_ROLES, write: [] },
  },
  Post: {
    id: { read: ALL_ROLES, write: [] },
    title: { read: ALL_ROLES, write: ADMIN_EDITOR_USER },
    content: { read: ALL_ROLES, write: ADMIN_EDITOR_USER },
    published: { read: ALL_ROLES, write: ADMIN_EDITOR },
    viewCount: { read: ALL_ROLES, write: ADMIN_ONLY },
    authorId: { read: ALL_ROLES, write: AUTHENTICATED },
    author: { read: ALL_ROLES, write: [] },
    comments: { read: ALL_ROLES, write: [] },
    tags: { read: ALL_ROLES, write: ADMIN_EDITOR_USER },
    createdAt: { read: ALL_ROLES, write: [] },
    updatedAt: { read: ALL_ROLES, write: [] },
  },
  Comment: {
    id: { read: ALL_ROLES, write: [] },
    content: { read: ALL_ROLES, write: AUTHENTICATED },
    approved: { read: ALL_ROLES, write: ADMIN_EDITOR },
    postId: { read: ALL_ROLES, write: AUTHENTICATED },
    post: { read: ALL_ROLES, write: [] },
    authorId: { read: ALL_ROLES, write: AUTHENTICATED },
    author: { read: ALL_ROLES, write: [] },
    createdAt: { read: ALL_ROLES, write: [] },
    updatedAt: { read: ALL_ROLES, write: [] },
  },
  SavedQuery: {
    id: { read: AUTHENTICATED, write: [] },
    name: { read: AUTHENTICATED, write: AUTHENTICATED },
    description: { read: AUTHENTICATED, write: AUTHENTICATED },
    query: { read: AUTHENTICATED, write: AUTHENTICATED },
    variables: { read: AUTHENTICATED, write: AUTHENTICATED },
    userId: { read: ADMIN_ONLY, write: AUTHENTICATED },
    user: { read: ADMIN_ONLY, write: [] },
    createdAt: { read: AUTHENTICATED, write: [] },
    updatedAt: { read: AUTHENTICATED, write: [] },
  },
  RequestLog: {
    id: { read: ADMIN_ONLY, write: [] },
    operation: { read: ADMIN_ONLY, write: [] },
    query: { read: ADMIN_ONLY, write: [] },
    variables: { read: ADMIN_ONLY, write: [] },
    result: { read: ADMIN_ONLY, write: [] },
    errors: { read: ADMIN_ONLY, write: [] },
    duration: { read: ADMIN_ONLY, write: [] },
    userId: { read: ADMIN_ONLY, write: [] },
    user: { read: ADMIN_ONLY, write: [] },
    ipAddress: { read: ADMIN_ONLY, write: [] },
    userAgent: { read: ADMIN_ONLY, write: [] },
    createdAt: { read: ADMIN_ONLY, write: [] },
  },
};

export const canRead = (role: Role, model: string, field: string): boolean => {
  const modelPerms = permissions[model];
  if (!modelPerms) return true;
  const fieldPerms = modelPerms[field];
  if (!fieldPerms) return true;
  return fieldPerms.read.includes(role);
};

export const canWrite = (role: Role, model: string, field: string): boolean => {
  const modelPerms = permissions[model];
  if (!modelPerms) return true;
  const fieldPerms = modelPerms[field];
  if (!fieldPerms) return true;
  return fieldPerms.write.includes(role);
};
