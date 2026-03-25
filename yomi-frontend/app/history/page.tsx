'use client';

import React, { useEffect, useState } from 'react';
import { getUserHistory, deleteStory, getUserSongs, deleteSong, getCommunitySongs, toggleSongShare, cloneCommunitySong } from '../../services/api';
// 🌟 הוספתי אייקון של Search (זכוכית מגדלת)
import { Book, Loader2, ArrowRight, Ghost, Trash2, Music, Globe, Lock, Crown, Download, Search,Check } from 'lucide-react';
import Link from 'next/link';
import Reader from '../../components/Reader';
import SongViewer from '../../components/SongViewer'; 
import { useAuth } from '../../hooks/useAuth';

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  
  // 🌟 סטייט מדומיין למשתמש פרו (תחליף בלוגיקה האמיתית שלך בהמשך)
  const isProUser = true; 

  // טאבים
  const [activeTab, setActiveTab] = useState<'stories' | 'songs' | 'community'>('stories');
  
  // נתונים
  const [stories, setStories] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [communitySongs, setCommunitySongs] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // 🌟 סטייט חדש עבור מילת החיפוש
  const [searchTerm, setSearchTerm] = useState('');
  
  // פריטים נבחרים
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. טעינת הנתונים
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        const [storiesData, songsData] = await Promise.all([
          getUserHistory(user.id),
          getUserSongs(user.id)
        ]);
        setStories(storiesData);
        setSongs(songsData);
        
        // משיכת שירי הקהילה דרך api.ts
        if (isProUser) {
           const cSongs = await getCommunitySongs();
           setCommunitySongs(cSongs);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    if (!authLoading) fetchHistory();
  }, [user, authLoading, isProUser]);

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

  // פונקציית עדכון מצב השיתוף (מחוברת ל-api.ts)
  const toggleSongVisibility = async (e: React.MouseEvent, songId: string, currentIsPublic: boolean) => {
      e.stopPropagation();
      try {
          await toggleSongShare(songId, !currentIsPublic, user.id);
          
          setSongs(prev => prev.map(s => s.id === songId ? { ...s, is_public: !currentIsPublic } : s));
          alert(currentIsPublic ? 'השיר הוסתר מהקהילה' : 'השיר שותף בקהילה בהצלחה!');
      } catch (error) {
          console.error('Error sharing song', error);
          alert('אירעה שגיאה בעדכון ההגדרות');
      }
  };

  // פונקציית העתקת השיר (מחוברת ל-api.ts)
  const handleCloneCommunitySong = async (e: React.MouseEvent, songId: string) => {
      e.stopPropagation();
      try {
          const newSongData = await cloneCommunitySong(songId, user.id);
          
          setSongs(prev => [newSongData.song, ...prev]);
          alert('השיר הועתק בהצלחה לספרייה שלך!');
          setActiveTab('songs'); // מעבר אוטומטי לטאב השירים
      } catch (error) {
          console.error('Error cloning song', error);
          alert('אירעה שגיאה בשמירת השיר');
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
          <button onClick={() => setSelectedStory(null)} className="mb-6 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 bg-white dark:bg-[#1E293B] px-5 py-2.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <ArrowRight size={20} /> חזור לספרייה
          </button>
          <Reader storyContent={selectedStory.japanese_content} storyId={selectedStory.id} userId={user.id} />
        </div>
      </div>
    );
  }

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

          {/* כפתורי הטאבים */}
          <div className="flex bg-white dark:bg-[#1E293B] p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveTab('stories')}
              className={`flex-1 min-w-[120px] md:px-6 py-2.5 text-sm md:text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'stories' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <Book size={18} /> הטקסטים שלי
            </button>
            <button 
              onClick={() => setActiveTab('songs')}
              className={`flex-1 min-w-[120px] md:px-6 py-2.5 text-sm md:text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'songs' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <Music size={18} /> השירים שלי
            </button>
            <button 
              onClick={() => isProUser ? setActiveTab('community') : alert('ספריית הקהילה פתוחה למשתמשי PRO בלבד')}
              className={`flex-1 min-w-[140px] md:px-6 py-2.5 text-sm md:text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 
              ${!isProUser ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400' : 
                activeTab === 'community' ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {isProUser ? <Globe size={18} /> : <Lock size={18} />} 
              קהילת ה-PRO <Crown size={14} className="text-yellow-500 ml-1" />
            </button>
          </div>
        </div>

        {/* --- אזור הסיפורים --- */}
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

        {/* --- אזור השירים --- */}
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
                  const displayTitle = song.title || song.lyrics_data?.[0]?.lineText || 'שיר ללא שם';
                  
                  return (
                    <div key={song.id} onClick={() => setSelectedSong(song)} className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-56 relative group">
                      <button onClick={(e) => handleDeleteSong(e, song.id)} className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 dark:bg-[#1E293B] rounded-full p-2 opacity-0 group-hover:opacity-100 shadow-sm z-10"><Trash2 size={18} /></button>
                      
                      <div className="flex flex-col h-full items-center justify-center text-center px-4 pt-6">
                        <Music size={40} className="text-blue-500 mb-4 opacity-80 group-hover:scale-110 transition-transform duration-300" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-snug" dir="auto">
                          {displayTitle}
                        </h3>
                      </div>
                      
                      <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-50 dark:border-gray-800">
                          <div className="text-xs text-gray-400 font-mono text-left" dir="ltr">{new Date(song.created_at).toLocaleDateString('he-IL')}</div>
                          
                          <button 
                            onClick={(e) => toggleSongVisibility(e, song.id, song.is_public)}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                                song.is_public 
                                ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' 
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                              {song.is_public ? <><Globe size={12}/> ציבורי</> : <><Lock size={12}/> פרטי</>}
                          </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

          {/* --- אזור הקהילה (רק למשתמשי פרו) --- */}
        {activeTab === 'community' && isProUser && (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 border border-purple-100 dark:border-purple-800/30 rounded-2xl p-6 mb-8 flex items-center gap-4">
                <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-full text-purple-600 dark:text-purple-300">
                    <Globe size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">ספריית קהילת ה-PRO</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">גלה שירים שתורגמו על ידי משתמשים אחרים בקהילה, הוסף אותם לספרייה שלך ולמד אוצר מילים חדש!</p>
                </div>
             </div>

             {/* 🌟 שורת החיפוש החדשה */}
             <div className="relative mb-8 max-w-xl">
                 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                 <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חפש שיר בקהילה לפי כותרת..."
                    className="w-full pl-6 pr-12 py-3.5 bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-800 focus:border-purple-300 dark:focus:border-purple-700 transition-all text-lg"
                 />
             </div>

             {communitySongs.length === 0 ? (
                 <div className="text-center bg-white dark:bg-[#111827] p-16 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                     <h2 className="text-2xl text-gray-600 dark:text-gray-400 mb-4">עדיין אין שירים בקהילה. תהיה הראשון לשתף!</h2>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* 🌟 החלת לוגיקת החיפוש */}
                 {communitySongs
                  .filter(song => {
                      const displayTitle = song.title || song.lyrics_data?.[0]?.lineText || '';
                      return displayTitle.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .map((song) => {
                   const displayTitle = song.title || song.lyrics_data?.[0]?.lineText || 'שיר ללא שם';
                   const isMyOwnSong = song.user_id === user.id;

                   // 🌟 הלוגיקה למניעת כפילויות: בודקים אם שיר עם אותה כותרת כבר קיים ברשימה שלי
                   const isAlreadySaved = songs.some(mySong => {
                       const mySongTitle = mySong.title || mySong.lyrics_data?.[0]?.lineText || 'שיר ללא שם';
                       return mySongTitle === displayTitle;
                   });

                   return (
                     <div 
                        key={song.id} 
                        onClick={() => setSelectedSong(song)}
                        className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all flex flex-col justify-between h-56 relative group cursor-pointer"
                     >
                       
                       <div className="flex flex-col h-full items-center justify-center text-center px-4 pt-2">
                         <div className="bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full p-3 mb-4 shadow-sm group-hover:scale-110 transition-transform">
                            <Music size={24} className="text-white" />
                         </div>
                         <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug pl-2" dir="auto">
                           {displayTitle}
                         </h3>
                       </div>
                       
                       <div className="flex justify-center mt-auto pt-4 border-t border-gray-50 dark:border-gray-800">
                           {/* 🌟 עץ החלטות לכפתורים: שלי / כבר שמור / חדש */}
                           {isMyOwnSong ? (
                             <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium rounded-xl border border-gray-200 dark:border-gray-700/50 cursor-not-allowed">
                               <Globe size={16} /> שותף על ידך
                             </button>
                           ) : isAlreadySaved ? (
                             <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium rounded-xl border border-green-200 dark:border-green-800/40 cursor-not-allowed">
                               <Check size={16} /> קיים בספרייה
                             </button>
                           ) : (
                             <button 
                               onClick={(e) => handleCloneCommunitySong(e, song.id)}
                               className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 dark:bg-[#1E293B] hover:bg-purple-700 dark:hover:bg-purple-900/40 text-white dark:text-purple-300 font-bold rounded-xl transition-colors border border-gray-700 dark:border-gray-600 hover:border-purple-600 dark:hover:border-purple-700 shadow-sm"
                             >
                                 <Download size={16} /> הוסף לספרייה שלי
                             </button>
                           )}
                       </div>
                     </div>
                   );
                 })}
                 
                 {/* 🌟 הצגת הודעה אם החיפוש לא הניב תוצאות */}
                 {communitySongs.filter(song => {
                      const displayTitle = song.title || song.lyrics_data?.[0]?.lineText || '';
                      return displayTitle.toLowerCase().includes(searchTerm.toLowerCase());
                  }).length === 0 && searchTerm && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center bg-white dark:bg-[#111827] p-12 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-4">
                        <Ghost size={48} className="text-gray-300 dark:text-gray-700 mb-4 mx-auto" />
                        <h3 className="text-xl text-gray-700 dark:text-gray-300 mb-2">לא נמצאו שירים בקהילה התואמים את החיפוש</h3>
                        <p className="text-gray-500 dark:text-gray-500">נסה מילת חיפוש אחרת או אפס את החיפוש.</p>
                        <button onClick={() => setSearchTerm('')} className="mt-4 text-purple-600 dark:text-purple-400 font-bold hover:underline">נקה חיפוש</button>
                    </div>
                  )}
               </div>
             )}
           </div>
        )}

      </div>
    </main>
  );
}