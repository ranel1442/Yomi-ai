'use client';

import React, { useEffect, useState } from 'react';
import { getUserHistory, deleteStory } from '../../services/api';
import { Book, Loader2, ArrowRight, Ghost, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Reader from '../../components/Reader';
import { useAuth } from '../../hooks/useAuth';

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        const data = await getUserHistory(user.id);
        setStories(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    if (!authLoading) fetchHistory();
  }, [user, authLoading]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('האם אתה בטוח שברצונך למחוק את הטקסט הזה?')) return;
    try {
      setDeletingId(id);
      await deleteStory(id);
      setStories(prev => prev.filter(story => story.id !== id));
      if (selectedStory?.id === id) setSelectedStory(null);
    } catch (error) {
      alert('אירעה שגיאה במחיקת הסיפור.');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || (isLoading && user)) {
    return <div className="flex justify-center items-center h-screen bg-transparent"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-transparent">
        <Ghost size={64} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">עליך להתחבר כדי לראות את ההיסטוריה שלך</h2>
        <Link href="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">לחץ כאן להתחברות</Link>
      </div>
    );
  }

  if (selectedStory) {
    return (
      <div className="min-h-screen bg-transparent py-12 px-4">
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
          <button
            onClick={() => setSelectedStory(null)}
            className="mb-6 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-2 bg-white dark:bg-[#1E293B] px-5 py-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors w-fit"
          >
            <ArrowRight size={20} />
            חזור לספרייה
          </button>
          <Reader storyContent={selectedStory.japanese_content} storyId={selectedStory.id} userId={user.id} />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent py-12 px-4 font-sans text-right selection:bg-blue-500/30" dir="rtl">
      <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-10 border-b border-gray-200 dark:border-gray-800 pb-6">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Book className="text-blue-600 dark:text-blue-500" size={36} />
            הספרייה שלי
          </h1>
          <Link href="/" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-md dark:shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            צור טקסט חדש
          </Link>
        </div>

        {stories.length === 0 ? (
          <div className="text-center bg-white dark:bg-[#111827] p-16 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl text-gray-600 dark:text-gray-400 mb-4">עדיין אין לך טקסטים שמורים</h2>
            <Link href="/" className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-lg">צור את הסיפור הראשון שלך!</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => {
              const isDeleting = deletingId === story.id;
              return (
                <div 
                  key={story.id} 
                  onClick={() => setSelectedStory(story)}
                  className={`bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md dark:hover:border-gray-700 transition-all cursor-pointer flex flex-col justify-between h-52 relative group ${isDeleting ? 'opacity-50 scale-95' : ''}`}
                >
                  <button 
                    onClick={(e) => handleDelete(e, story.id)}
                    disabled={isDeleting}
                    className="absolute top-4 left-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-gray-50 dark:bg-[#1E293B] rounded-full p-2 opacity-0 group-hover:opacity-100 shadow-sm z-10"
                    title="מחק סיפור"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  </button>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pl-10">
                      {story.japanese_content.title_japanese}
                    </h3>
                    <h4 className="text-gray-700 dark:text-gray-300 font-medium mb-3 line-clamp-1">
                      {story.japanese_content.title_hebrew}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-500 line-clamp-2">
                      {story.original_hebrew_text}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-600 text-left mt-4 font-mono" dir="ltr">
                    {new Date(story.created_at).toLocaleDateString('he-IL')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}