'use client';

import React, { useEffect, useState } from 'react';
import { getUserHistory, deleteStory, getUserSongs, deleteSong } from '../../services/api';
import { Book, Loader2, ArrowRight, Ghost, Trash2, Music } from 'lucide-react';
import Link from 'next/link';
import Reader from '../../components/Reader';
import SongViewer from '../../components/SongViewer'; // 🌟 ייבוא הקומפוננטה החדשה!
import { useAuth } from '../../hooks/useAuth';

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  
  // טאבים
  const [activeTab, setActiveTab] = useState<'stories' | 'songs'>('stories');
  
  // נתונים
  const [stories, setStories] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // פריטים נבחרים (כדי להציג את התוכן)
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        // מביאים גם את הסיפורים וגם את השירים בו זמנית!
        const [storiesData, songsData] = await Promise.all([
          getUserHistory(user.id),
          getUserSongs(user.id)
        ]);
        setStories(storiesData);
        setSongs(songsData);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    if (!authLoading) fetchHistory();
  }, [user, authLoading]);

  const handleDeleteStory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('האם אתה בטוח שברצונך למחוק את הטקסט הזה?')) return;
    try {
      setDeletingId(id);
      await deleteStory(id);
      setStories(prev => prev.filter(story => story.id !== id));
    } catch (error) {
      alert('אירעה שגיאה במחיקת הסיפור.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSong = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('האם אתה בטוח שברצונך למחוק את השיר הזה? כל הכרטיסיות שלו יימחקו גם כן.')) return;
    try {
      setDeletingId(id);
      await deleteSong(id);
      setSongs(prev => prev.filter(song => song.id !== id));
    } catch (error) {
      alert('אירעה שגיאה במחיקת השיר.');
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

  // 🌟 הצגת סיפור נבחר
  if (selectedStory) {
    return (
      <div className="min-h-screen bg-transparent py-12 px-4">
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
          <button onClick={() => setSelectedStory(null)} className="mb-6 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 bg-white dark:bg-[#1E293B] px-5 py-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <ArrowRight size={20} /> חזור לספרייה
          </button>
          <Reader storyContent={selectedStory.japanese_content} storyId={selectedStory.id} userId={user.id} />
        </div>
      </div>
    );
  }

  // 🌟 הצגת שיר נבחר
  if (selectedSong) {
    return (
      <div className="min-h-screen bg-transparent py-12 px-4">
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
          <button onClick={() => setSelectedSong(null)} className="mb-6 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 bg-white dark:bg-[#1E293B] px-5 py-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <ArrowRight size={20} /> חזור לספרייה
          </button>
          <SongViewer song={selectedSong} userId={user.id} />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent py-12 px-4 font-sans text-right selection:bg-blue-500/30" dir="rtl">
      <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Book className="text-blue-600 dark:text-blue-500" size={36} />
            הספרייה שלי
          </h1>

          {/* 🌟 כפתורי הטאבים (שירים / סיפורים) */}
          <div className="flex bg-white dark:bg-[#1E293B] p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('stories')}
              className={`flex-1 md:px-8 py-2.5 text-sm md:text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'stories' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <Book size={18} /> הטקסטים שלי
            </button>
            <button 
              onClick={() => setActiveTab('songs')}
              className={`flex-1 md:px-8 py-2.5 text-sm md:text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'songs' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <Music size={18} /> השירים שלי
            </button>
          </div>
        </div>

        {/* 🌟 אזור הסיפורים */}
        {activeTab === 'stories' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {stories.length === 0 ? (
              <div className="text-center bg-white dark:bg-[#111827] p-16 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl text-gray-600 dark:text-gray-400 mb-4">עדיין אין לך טקסטים שמורים</h2>
                <Link href="/" className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-lg">צור את הסיפור הראשון שלך!</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((story) => (
                  <div key={story.id} onClick={() => setSelectedStory(story)} className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-52 relative group">
                    <button onClick={(e) => handleDeleteStory(e, story.id)} className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 dark:bg-[#1E293B] rounded-full p-2 opacity-0 group-hover:opacity-100 shadow-sm z-10"><Trash2 size={18} /></button>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors pl-10">{story.japanese_content.title_japanese}</h3>
                      <h4 className="text-gray-700 dark:text-gray-300 font-medium mb-3 line-clamp-1">{story.japanese_content.title_hebrew}</h4>
                      <p className="text-sm text-gray-500 line-clamp-2">{story.original_hebrew_text}</p>
                    </div>
                    <div className="text-xs text-gray-400 mt-4 font-mono" dir="ltr">{new Date(story.created_at).toLocaleDateString('he-IL')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🌟 אזור השירים */}
        {activeTab === 'songs' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {songs.length === 0 ? (
              <div className="text-center bg-white dark:bg-[#111827] p-16 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl text-gray-600 dark:text-gray-400 mb-4">עדיין לא הוספת שירים</h2>
                <Link href="/songs" className="text-blue-600 dark:text-blue-400 font-bold hover:underline text-lg">נסה את השיעורים המוזיקליים שלנו!</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {songs.map((song) => {
                  // 🌟 זה הקסם של התמיכה לאחור: 
                  // אם יש title במסד הוא יוצג. אם לא, הוא יחפש את השורה הראשונה. ואם אין שום דבר, "שיר ללא שם".
                  const displayTitle = song.title || song.lyrics_data?.[0]?.lineText || 'שיר ללא שם';
                  
                  return (
                    <div key={song.id} onClick={() => setSelectedSong(song)} className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-52 relative group">
                      <button onClick={(e) => handleDeleteSong(e, song.id)} className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 dark:bg-[#1E293B] rounded-full p-2 opacity-0 group-hover:opacity-100 shadow-sm z-10"><Trash2 size={18} /></button>
                      <div className="flex flex-col h-full items-center justify-center text-center px-4">
                        <Music size={40} className="text-blue-500 mb-4 opacity-80 group-hover:scale-110 transition-transform duration-300" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug" dir="auto">
                          {displayTitle}
                        </h3>
                      </div>
                      <div className="text-xs text-gray-400 mt-auto font-mono text-left" dir="ltr">{new Date(song.created_at).toLocaleDateString('he-IL')}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}