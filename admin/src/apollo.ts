import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: '/graphql',
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: `ws://${window.location.host}/graphql`,
    connectionParams: () => {
      const token = localStorage.getItem('token');
      return token ? { authorization: `Bearer ${token}` } : {};
    },
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  headers: {
    authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
  client.setLink(splitLink);
  client.resetStore();
};
