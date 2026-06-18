import { create } from 'zustand';
import { gql, useMutation, useQuery, useApolloClient } from '@apollo/client';
import { User } from '../types';
import { setAuthToken, clearAuth } from '../apollo';

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
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: true,
  
  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
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
      set({ user, token, isAuthenticated: true, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  
  logout: () => {
    clearAuth();
    set({ user: null, token: null, isAuthenticated: false, loading: false });
  },
  
  setUser: (user) => set({ user }),
  
  setLoading: (loading) => set({ loading }),
  
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ loading: false, isAuthenticated: false, user: null });
      return;
    }
    
    set({ loading: true });
    try {
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: ME_QUERY.loc?.source.body,
        }),
      });
      
      const data = await response.json();
      
      if (data.errors || !data.data?.me) {
        clearAuth();
        set({ user: null, token: null, isAuthenticated: false, loading: false });
      } else {
        set({ user: data.data.me, token, isAuthenticated: true, loading: false });
      }
    } catch (error) {
      clearAuth();
      set({ user: null, token: null, isAuthenticated: false, loading: false });
    }
  },
}));

export const useCurrentUser = () => {
  const { user, loading, checkAuth } = useAuthStore();
  const client = useApolloClient();
  
  const { data, loading: queryLoading, refetch } = useQuery(ME_QUERY, {
    skip: !useAuthStore.getState().isAuthenticated,
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.me && !useAuthStore.getState().user) {
        useAuthStore.getState().setUser(data.me);
      }
    },
    onError: () => {
      useAuthStore.getState().logout();
    },
  });
  
  return { 
    user: user || data?.me, 
    loading: loading || queryLoading,
    refetch 
  };
};
