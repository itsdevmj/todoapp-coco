'use client';

import { useEffect, useState } from 'react';
import type { Todo } from '@/types/todo';

interface GamificationProps {
  todos: Todo[];
  userId: string;
}

interface UserStats {
  points: number;
  streak: number;
  lastCompletedDate: string | null;
  totalCompleted: number;
  level: number;
}

export default function Gamification({ todos, userId }: GamificationProps) {
  const [stats, setStats] = useState<UserStats>({
    points: 0,
    streak: 0,
    lastCompletedDate: null,
    totalCompleted: 0,
    level: 1,
  });
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementText, setAchievementText] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [todos, userId]);

  const loadStats = () => {
    const storageKey = `gamification_${userId}`;
    const achievementsKey = `achievements_${userId}`;
    const stored = localStorage.getItem(storageKey);
    const unlockedAchievements = JSON.parse(localStorage.getItem(achievementsKey) || '[]');
    
    let currentStats: UserStats = stored ? JSON.parse(stored) : {
      points: 0,
      streak: 0,
      lastCompletedDate: null,
      totalCompleted: 0,
      level: 1,
    };

    // Calculate stats from todos
    const completedTodos = todos.filter(t => t.completed);

    // Update streak
    if (currentStats.lastCompletedDate) {
      const lastDate = new Date(currentStats.lastCompletedDate);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        currentStats.streak = 0;
      }
    }

    // Calculate points
    let points = 0;
    completedTodos.forEach(todo => {
      if (todo.priority === 'high') points += 15;
      else if (todo.priority === 'medium') points += 10;
      else points += 5;
    });

    // Add streak bonus
    points += currentStats.streak * 5;

    // Calculate level
    const level = Math.floor(points / 100) + 1;
    const previousLevel = currentStats.level;

    currentStats = {
      ...currentStats,
      points,
      totalCompleted: completedTodos.length,
      level,
    };

    // Check for new achievements
    const newAchievements: string[] = [];
    
    if (completedTodos.length >= 1 && !unlockedAchievements.includes('first_task')) {
      newAchievements.push('first_task');
      showAchievementNotification('🎯 First Task Complete!', '🎯');
    }
    if (completedTodos.length >= 10 && !unlockedAchievements.includes('10_tasks')) {
      newAchievements.push('10_tasks');
      showAchievementNotification('⚡ 10 Tasks Completed!', '⚡');
    }
    if (completedTodos.length >= 50 && !unlockedAchievements.includes('50_tasks')) {
      newAchievements.push('50_tasks');
      showAchievementNotification('💪 50 Tasks Completed!', '💪');
    }
    if (level >= 5 && previousLevel < 5 && !unlockedAchievements.includes('level_5')) {
      newAchievements.push('level_5');
      showAchievementNotification('⭐ Reached Level 5!', '⭐');
    }

    if (newAchievements.length > 0) {
      localStorage.setItem(achievementsKey, JSON.stringify([...unlockedAchievements, ...newAchievements]));
    }

    setStats(currentStats);
    localStorage.setItem(storageKey, JSON.stringify(currentStats));
  };

  const updateStreak = () => {
    const storageKey = `gamification_${userId}`;
    const achievementsKey = `achievements_${userId}`;
    const unlockedAchievements = JSON.parse(localStorage.getItem(achievementsKey) || '[]');
    const today = new Date().toDateString();
    
    if (stats.lastCompletedDate !== today) {
      const newStreak = stats.streak + 1;
      const newStats = {
        ...stats,
        streak: newStreak,
        lastCompletedDate: today,
      };
      
      setStats(newStats);
      localStorage.setItem(storageKey, JSON.stringify(newStats));

      // Show achievement for milestones
      if (newStreak === 3) {
        showAchievementNotification('🔥 3 Day Streak!', '🔥');
      } else if (newStreak === 7 && !unlockedAchievements.includes('7_day_streak')) {
        showAchievementNotification('⭐ Week Warrior!', '⭐');
        localStorage.setItem(achievementsKey, JSON.stringify([...unlockedAchievements, '7_day_streak']));
      } else if (newStreak === 30 && !unlockedAchievements.includes('30_day_streak')) {
        showAchievementNotification('👑 Monthly Master!', '👑');
        localStorage.setItem(achievementsKey, JSON.stringify([...unlockedAchievements, '30_day_streak']));
      }
    }
  };

  const sendPushNotification = (title: string, body: string, icon: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>${icon}</text></svg>`,
          badge: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>${icon}</text></svg>`,
          tag: 'achievement',
          requireInteraction: false,
        });
      } catch (error) {
        console.log('Push notification error:', error);
      }
    }
  };

  const showAchievementNotification = (text: string, icon: string = '🎉') => {
    setAchievementText(text);
    setShowAchievement(true);
    setTimeout(() => setShowAchievement(false), 3000);
    
    // Send push notification
    sendPushNotification('Achievement Unlocked! 🎉', text, icon);
  };

  useEffect(() => {
    const completedToday = todos.filter(t => {
      if (!t.completed) return false;
      const completedDate = new Date(t.updatedAt).toDateString();
      return completedDate === new Date().toDateString();
    });

    if (completedToday.length > 0) {
      updateStreak();
    }
  }, [todos]);

  const progressToNextLevel = ((stats.points % 100) / 100) * 100;

  return (
    <>
      {showAchievement && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className="bg-yellow-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-lg">
            {achievementText}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 card-shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Progress</h2>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Level {stats.level}</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{stats.points} pts</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressToNextLevel}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {100 - (stats.points % 100)} pts to Level {stats.level + 1}
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔥</div>
              <div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.streak}</div>
                <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">Day Streak</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600 dark:text-gray-400">Complete tasks daily</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">to keep your streak!</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalCompleted}</div>
            <div className="text-xs font-semibold text-green-600 dark:text-green-400">Completed</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{todos.filter(t => !t.completed).length}</div>
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">Remaining</div>
          </div>
        </div>

        {/* Notification Permission */}
        {notificationPermission !== 'granted' && (
          <div className="mb-4 mt-4 lg:mt-0">
            <button
              onClick={() => {
                if ('Notification' in window) {
                  Notification.requestPermission().then(permission => {
                    setNotificationPermission(permission);
                  });
                }
              }}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="hidden sm:inline">Enable Achievement Notifications</span>
              <span className="sm:hidden">Enable Notifications</span>
            </button>
          </div>
        )}

        <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Achievements</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className={`text-center p-2 rounded-lg ${stats.totalCompleted >= 1 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700 opacity-50'}`}>
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">First Task</div>
            </div>
            <div className={`text-center p-2 rounded-lg ${stats.totalCompleted >= 10 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700 opacity-50'}`}>
              <div className="text-2xl mb-1">⚡</div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">10 Tasks</div>
            </div>
            <div className={`text-center p-2 rounded-lg ${stats.streak >= 7 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700 opacity-50'}`}>
              <div className="text-2xl mb-1">🔥</div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">7 Day Streak</div>
            </div>
            <div className={`text-center p-2 rounded-lg ${stats.totalCompleted >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700 opacity-50'}`}>
              <div className="text-2xl mb-1">💪</div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">50 Tasks</div>
            </div>
            <div className={`text-center p-2 rounded-lg ${stats.level >= 5 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700 opacity-50'}`}>
              <div className="text-2xl mb-1">⭐</div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Level 5</div>
            </div>
            <div className={`text-center p-2 rounded-lg ${stats.streak >= 30 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-700 opacity-50'}`}>
              <div className="text-2xl mb-1">👑</div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">30 Day Streak</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
