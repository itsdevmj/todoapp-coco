import { Cocobase } from 'cocobase';

if (!process.env.NEXT_PUBLIC_COCOBASE_API_KEY) {
  throw new Error('Missing COCOBASE_API_KEY, Check The Env');
}

const cocobaseInstance = new Cocobase({ 
  apiKey: process.env.NEXT_PUBLIC_COCOBASE_API_KEY,
});

// Wrapper to persist auth token (almost forgot lol)
class CocobaseWrapper {
  private instance: Cocobase;
  private TOKEN_KEY = 'cocobase_auth_token';
  private USER_KEY = 'cocobase_user';

  constructor(instance: Cocobase) {
    this.instance = instance;
    this.restoreSession();
  }

  private restoreSession() {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      // Restore the token to the Cocobase instance (very important)
      (this.instance as any).token = token;
    }
  }

  async login(email: string, password: string) {
    const result = await this.instance.login(email, password);
    
    // Store token and user data
    if (typeof window !== 'undefined') {
      const token = (this.instance as any).token;
      if (token) {
        localStorage.setItem(this.TOKEN_KEY, token);
      }
      localStorage.setItem(this.USER_KEY, JSON.stringify(result));
    }
    
    return result;
  }

  async register(email: string, password: string) {
    const result = await this.instance.register(email, password);
    
    // Store token and user data
    if (typeof window !== 'undefined') {
      const token = (this.instance as any).token;
      if (token) {
        localStorage.setItem(this.TOKEN_KEY, token);
      }
      localStorage.setItem(this.USER_KEY, JSON.stringify(result));
    }
    
    return result;
  }

  async getCurrentUser() {
    try {
      // Try to get user from API first
      const user = await this.instance.getCurrentUser();
      if (user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
        return user;
      }
    } catch (error) {
      // If API call fails, try to get from localStorage (fallback as usual)
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem(this.USER_KEY);
        if (storedUser) {
          return JSON.parse(storedUser);
        }
      }
    }
    return null;
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    return this.instance.logout();
  }

  // Proxy all other methods to the original instance
  createDocument(collection: string, data: any) {
    return this.instance.createDocument(collection, data);
  }

  listDocuments(collection: string) {
    return this.instance.listDocuments(collection);
  }

  updateDocument(collection: string, id: string, data: any) {
    return this.instance.updateDocument(collection, id, data);
  }

  deleteDocument(collection: string, id: string) {
    return this.instance.deleteDocument(collection, id);
  }

  getDocument(collection: string, id: string) {
    return this.instance.getDocument(collection, id);
  }
}

export const db = new CocobaseWrapper(cocobaseInstance);

export const COLLECTIONS = {
  TODOS: 'todos',
} as const;