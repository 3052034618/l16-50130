import { GraphQLContext } from '../types';

export const relationResolvers = {
  User: {
    posts: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.postsByAuthorId.load(parent.id);
    },
    comments: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.commentsByAuthorId.load(parent.id);
    },
    profile: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.profileByUserId.load(parent.id);
    },
  },
  Profile: {
    user: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.user.load(parent.userId);
    },
  },
  Post: {
    author: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.user.load(parent.authorId);
    },
    comments: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.commentsByPostId.load(parent.id);
    },
  },
  Comment: {
    post: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.post.load(parent.postId);
    },
    author: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.user.load(parent.authorId);
    },
  },
  SavedQuery: {
    user: async (parent: any, _: any, context: GraphQLContext) => {
      return context.loaders.user.load(parent.userId);
    },
  },
  RequestLog: {
    user: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.userId) return null;
      return context.loaders.user.load(parent.userId);
    },
  },
};
