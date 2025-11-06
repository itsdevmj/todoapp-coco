'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/cocobase';
import TodoList from '@/components/TodoList';
import AddTodo from '@/components/AddTodo';
import ThemeToggle from '@/components/ThemeToggle';
import Gamification from '@/components/Gamification';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchTodos();
      window.addEventListener('todoAdded', fetchTodos);
      window.addEventListener('todoUpdated', fetchTodos);
      return () => {
        window.removeEventListener('todoAdded', fetchTodos);
        window.removeEventListener('todoUpdated', fetchTodos);
      };
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const currentUser = await db.getCurrentUser();
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
      }
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodos = async () => {
    if (!user?.id) return;
    try {
      const allTodos = await db.listDocuments('todos');
      const userTodos = allTodos
        .filter((todo: any) => todo.data.userId === user.id)
        .map((todo: any) => ({
          id: todo.id,
          ...todo.data
        }));
      setTodos(userTodos);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const handleLogout = async () => {
    await db.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-800 border-t-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-600 opacity-20 mx-auto"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-semibold">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          {/* Top row: Logo and Actions */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">TaskFlow</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="px-3 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg sm:rounded-xl hover:shadow-lg transition-all"
              >
                <span className="hidden sm:inline">Sign out</span>
                <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom row: Welcome message and Date */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Welcome back, <span className="font-semibold">{user?.email?.split('@')[0] || 'User'}</span>
            </p>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Add Task & Gamification */}
          <div className="lg:col-span-1 space-y-6">
            <AddTodo userId={user?.id} />
            <Gamification todos={todos} userId={user?.id} />
          </div>

          {/* Right Column - Task List */}
          <div className="lg:col-span-2">
            <TodoList userId={user?.id} />
          </div>
        </div>
      </div>
    </main>
  );
}