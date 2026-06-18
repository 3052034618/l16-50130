import { PrismaClient } from '@prisma/client';
import { GraphQLContext } from '../types';
import { generateToken, hashPassword, comparePassword } from '../auth';
import { gql } from 'graphql-tag';

export const authTypeDefs = gql`
  extend type Query {
    me: User
  }

  extend type Mutation {
    login(username: String!, password: String!): AuthPayload!
    register(username: String!, email: String!, password: String!): AuthPayload!
  }

  type AuthPayload {
    token: String!
    user: User!
  }
`;

export const createAuthResolvers = (prisma: PrismaClient) => ({
  Query: {
    me: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user) return null;
      return context.loaders.user.load(context.user.id);
    },
  },
  Mutation: {
    login: async (_: any, { username, password }: any) => {
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) {
        throw new Error('Invalid credentials');
      }
      if (!comparePassword(password, user.password)) {
        throw new Error('Invalid credentials');
      }
      const token = generateToken(user);
      return { token, user };
    },
    register: async (_: any, { username, email, password }: any) => {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
      });
      if (existingUser) {
        throw new Error('Username or email already exists');
      }
      const hashedPassword = hashPassword(password);
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
        },
      });
      const token = generateToken(user);
      return { token, user };
    },
  },
});
