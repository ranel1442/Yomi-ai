'use client';

import { useState, useRef } from 'react';
import { Music, UploadCloud, Loader2, Info } from 'lucide-react';
// הייבוא של הפונקציה מהסרביס שלנו במקום להשתמש ב-fetch ישיר
import { processSongWithGemini } from '../../services/api';

export default function SongsPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncData, setSyncData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedWord, setSelectedWord] = useState<any>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // טיפול בבחירת קובץ ה-MP3
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      // יצירת כתובת URL מקומית כדי שנוכל לנגן את השיר מיד בלי להוריד אותו מהשרת
      setAudioUrl(URL.createObjectURL(file)); 
    }
  };

  // שליחת הנתונים לבאקנד דרך ה-api.ts שלנו
  const handleSubmit = async () => {
    if (!audioFile || !lyrics.trim()) {
      alert('יש להעלות קובץ אודיו ולהזין מילים');
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('lyrics', lyrics);

      // קריאה לפונקציה המסודרת שיצרנו ב-api.ts
      const data = await processSongWithGemini(formData);
      setSyncData(data.lyricsData); // שומרים את מערך המילים המתוזמנות
      
    } catch (error) {
      console.error(error);
      alert('אירעה שגיאה בעיבוד השיר. ודא שהשרת פועל.');
    } finally {
      setIsLoading(false);
    }
  };

  // פונקציה שרצה בכל חלקיק שנייה שהשיר מתנגן ומעדכנת את הזמן הנוכחי
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 w-full">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-800 dark:text-white">
        <Music className="text-blue-500" size={32} /> 
        למידה דרך שירים
      </h1>

      {/* ========== שלב 1: טופס העלאה ========== */}
      {!syncData && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">1. בחר קובץ MP3</label>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                dark:file:bg-blue-900/20 dark:file:text-blue-400
                hover:file:bg-blue-100 transition-all cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">2. הדבק את מילות השיר ביפנית</label>
            <textarea 
              rows={8}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="הדבק כאן את הטקסט..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0B0F19] p-4 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              dir="ltr"
            />
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isLoading || !audioFile || !lyrics}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                מנתח ומסנכרן עם ג'מיני... (זה עשוי לקחת דקה)
              </>
            ) : (
              <>
                <UploadCloud size={20} />
                צור שיעור אינטראקטיבי
              </>
            )}
          </button>
        </div>
      )}

      {/* ========== שלב 2: הנגן וחווית הלמידה ========== */}
      {syncData && (
        <div className="flex flex-col gap-6">
          
          {/* הנגן (דביק כדי שיישאר על המסך כשגוללים את המילים למטה) */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 sticky top-24 z-10 flex flex-col gap-4">
            {audioUrl && (
              <audio 
                ref={audioRef}
                src={audioUrl} 
                controls 
                className="w-full outline-none"
                onTimeUpdate={handleTimeUpdate}
              />
            )}
            
            {/* אזור הצגת מילה נבחרת */}
            <div className={`transition-all duration-300 ${selectedWord ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
              {selectedWord && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/50">
                  <Info className="text-blue-500 shrink-0 mt-1" size={20} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xl">{selectedWord.word}</span>
                      <span className="text-sm text-gray-500">({selectedWord.reading})</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      צורת בסיס (לחיפוש במילון): <span className="font-medium text-blue-600 dark:text-blue-400">{selectedWord.base_form}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* תצוגת המילים המוארות */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800 leading-loose text-center min-h-[50vh]">
            {syncData.map((line: any, i: number) => (
              <div key={i} className="mb-8">
                {line.words.map((word: any, j: number) => {
                  // בדיקה האם הזמן הנוכחי של השיר נמצא בין תחילת המילה לסופה
                  const isHighlighted = currentTime >= word.startTime && currentTime <= word.endTime;
                  
                  return (
                    <span 
                      key={j} 
                      onClick={() => setSelectedWord(word)}
                      className={`cursor-pointer mx-1.5 px-1 rounded transition-all duration-150 inline-block ${
                        isHighlighted 
                          ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold scale-110 shadow-sm' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {/* שימוש בתגית ruby לפוריגנה */}
                      <ruby className="text-xl md:text-2xl">
                        {word.word}
                        <rt className="text-[10px] md:text-xs text-gray-500 font-normal select-none">{word.reading}</rt>
                      </ruby>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          
        </div>
      )}
    </div>
  );
}