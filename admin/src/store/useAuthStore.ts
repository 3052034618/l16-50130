import { create } from 'zustand';
import { gql, useMutation, useQuery } from '@apollo/client';
import { User } from '../types';
import { setAuthToken } from '../apollo';

const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      user {
        id
        username
        email
        role
      }
    }
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      role
    }
  }
`;

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: async (username: string, password: string) => {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: LOGIN_MUTATION.loc?.source.body,
        variables: { username, password },
      }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }
    
    const { token, user } = data.data.login;
    setAuthToken(token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  setUser: (user) => set({ user }),
}));

export const useCurrentUser = () => {
  const { data, loading } = useQuery(ME_QUERY, {
    skip: !useAuthStore.getState().isAuthenticated,
  });
  
  return { user: data?.me, loading };
};
