'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  RefreshCw,
  BrainCircuit,
  Flame,
  CheckCircle2,
  Mic,
  BookOpen,
  MessagesSquare,
  ScanEye,
  ShieldCheck,
  Loader2,
  CalendarDays,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useStreak } from '../../hooks/useStreak';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  getAnalyticsSummary,
  downloadAnalyticsBackup,
  AnalyticsSummaryResponse,
  AnalyticsHeatmapDay,
} from '../../services/api';

function CircularGauge({
  value,
  colorClass,
  subtitle,
}: {
  value: number | null;
  colorClass: string;
  subtitle: string;
}) {
  const pct = value !== null ? Math.max(0, Math.min(100, value)) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="10"
            className="text-gray-200 dark:text-slate-800"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-700`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-black text-lg text-gray-900 dark:text-white">
          {value !== null ? `${value}%` : '—'}
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{subtitle}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const { streak: profileStreak } = useStreak(user);
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<AnalyticsHeatmapDay | null>(null);

  const fetchSummary = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const targetUserId = user?.id || 'anonymous';
      const data = await getAnalyticsSummary(targetUserId);
      setSummary(data);
      if (data.heatmap30Days?.length > 0) {
        setSelectedDay(data.heatmap30Days[data.heatmap30Days.length - 1]);
      }
    } catch (err) {
      console.error('Failed to fetch analytics summary:', err);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleDownloadJsonBackup = async () => {
    if (!user?.id) {
      setBackupNotice('יש להתחבר לחשבון כדי להוריד קובץ גיבוי מלא.');
      return;
    }

    setDownloadingBackup(true);
    setBackupNotice(null);
    try {
      const fileName = await downloadAnalyticsBackup(user.id);
      setBackupNotice(`הגיבוי הורד בהצלחה למחשב שלך: ${fileName}`);
    } catch (err) {
      console.error('Backup download failed:', err);
      setBackupNotice('אירעה שגיאה בהורדת קובץ הגיבוי.');
    } finally {
      setDownloadingBackup(false);
    }
  };

  const fsrsRows = useMemo(() => {
    const total = Math.max(1, summary?.totalCards || 0);
    const b = summary?.fsrsBreakdown || { new: 0, learning: 0, review: 0, mastered: 0 };
    return [
      {
        key: 'mastered',
        shortName: 'נשלטות (Mastered)',
        label: 'נשלטות לטווח ארוך (Mastered · מרווח 21+ ימים)',
        count: b.mastered,
        pct: summary?.totalCards ? Math.round((b.mastered / total) * 100) : 0,
        hexColor: '#10b981',
        barColor: 'bg-emerald-500',
        badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
      },
      {
        key: 'review',
        shortName: 'בחזרה פעילה (Review)',
        label: 'בחזרה פעילה (Active Review)',
        count: b.review,
        pct: summary?.totalCards ? Math.round((b.review / total) * 100) : 0,
        hexColor: '#3b82f6',
        barColor: 'bg-blue-500',
        badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
      },
      {
        key: 'learning',
        shortName: 'בלמידה (Learning)',
        label: 'בלמידה וחיזוק ראשוני (Learning / Relearning)',
        count: b.learning,
        pct: summary?.totalCards ? Math.round((b.learning / total) * 100) : 0,
        hexColor: '#f59e0b',
        barColor: 'bg-amber-500',
        badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
      },
      {
        key: 'new',
        shortName: 'חדשות (New)',
        label: 'חדשות בחפיסה (New)',
        count: b.new,
        pct: summary?.totalCards ? Math.round((b.new / total) * 100) : 0,
        hexColor: '#64748b',
        barColor: 'bg-slate-400 dark:bg-slate-500',
        badgeColor: 'text-slate-600 dark:text-slate-300 bg-slate-500/15',
      },
    ];
  }, [summary]);

  const pieChartData = useMemo(() => {
    const nonEmpty = fsrsRows.filter((r) => r.count > 0);
    if (nonEmpty.length > 0) {
      return nonEmpty.map((r) => ({
        name: r.shortName,
        value: r.count,
        color: r.hexColor,
      }));
    }
    return [{ name: 'ללא כרטיסיות עדיין', value: 1, color: '#334155' }];
  }, [fsrsRows]);

  const displayStreak = useMemo(() => {
    const apiStreak = Number(summary?.currentStreak || 0);
    return Math.max(apiStreak, Number(profileStreak || 0));
  }, [summary?.currentStreak, profileStreak]);

  const getHeatmapCellColor = (total: number) => {
    if (total <= 0) {
      return 'bg-gray-100 dark:bg-slate-800/80 border-gray-200/80 dark:border-slate-700/70 text-gray-400';
    }
    if (total <= 2) {
      return 'bg-emerald-200 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200';
    }
    if (total <= 6) {
      return 'bg-emerald-400 dark:bg-emerald-700/80 border-emerald-500 text-slate-950 dark:text-white';
    }
    if (total <= 14) {
      return 'bg-emerald-500 dark:bg-emerald-600 border-emerald-400 text-white';
    }
    return 'bg-emerald-600 dark:bg-emerald-400 border-emerald-300 text-white dark:text-slate-950 shadow-sm shadow-emerald-500/30';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F19] py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Command Center Header */}
        <header className="bg-gradient-to-br from-slate-900 via-[#0f172a] to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold">
                <BarChart3 size={15} />
                <span>MASTERY ANALYTICS & BACKUP COMMAND CENTER</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                מרכז שליטה, אנליטיקת FSRS וגיבוי נתונים
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                מעקב מלא אחר התפלגות הזיכרון שלך ב-FSRS, מפת חום של 30 ימי Immersion אחרונים, אחוזי שימור, וייצוא גיבוי מלא בלחיצה אחת.
              </p>
            </div>

            {/* Action Buttons: Refresh + Full JSON Backup Download */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={fetchSummary}
                disabled={loading}
                className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                title="רענן נתונים"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={handleDownloadJsonBackup}
                disabled={downloadingBackup || !user}
                className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                {downloadingBackup ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                <span>הורד גיבוי מלא למחשב (JSON)</span>
              </button>
            </div>
          </div>

          {backupNotice && (
            <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <span>{backupNotice}</span>
            </div>
          )}
        </header>

        {!user && !authLoading && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="text-sm font-bold text-amber-800 dark:text-amber-200">
              התחבר לחשבון האישי שלך כדי לצפות בנתוני ה-SRS האמיתיים שלך ולהוריד גיבוי JSON מלא.
            </div>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs shrink-0"
            >
              התחברות
            </Link>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 size={36} className="animate-spin text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
              מחשב מדדי FSRS ומפת פעילות...
            </p>
          </div>
        ) : (
          summary && (
            <>
              {/* Top KPI Summary Row (Large Metric Cards for Current Streak & Total Mined Words) */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Large Metric Card 1: Current Streak */}
                <div className="bg-gradient-to-br from-orange-500/10 via-white to-white dark:from-orange-950/30 dark:via-[#111827] dark:to-[#111827] rounded-3xl p-5 border border-orange-200/80 dark:border-orange-900/40 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400">
                      רצף למידה נוכחי (Current Streak)
                    </span>
                    <Flame
                      size={20}
                      className="text-orange-500 fill-orange-500/20"
                    />
                  </div>
                  <div className="my-2">
                    <div className="text-4xl font-black text-gray-900 dark:text-white flex items-baseline gap-1.5">
                      <span>{displayStreak}</span>
                      <span className="text-base font-bold text-orange-500">
                        ימים ברצף 🔥
                      </span>
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1">
                      {summary.activeDaysLast30} ימים פעילים מתוך 30 ·{' '}
                      {summary.totalActionsLast30} פעולות Immersion
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    שיא רצף: {Math.max(displayStreak, Number(summary.longestStreak || 0))} ימים
                  </span>
                </div>

                {/* Large Metric Card 2: Total Mined Words */}
                <div className="bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-950/30 dark:via-[#111827] dark:to-[#111827] rounded-3xl p-5 border border-blue-200/80 dark:border-blue-900/40 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                      סה״כ מילים שנכרו (Total Mined Words)
                    </span>
                    <BrainCircuit size={20} className="text-blue-500" />
                  </div>
                  <div className="my-2">
                    <div className="text-4xl font-black text-gray-900 dark:text-white flex items-baseline gap-1.5">
                      <span>{summary.totalCards}</span>
                      <span className="text-base font-bold text-blue-500">
                        מילים ב-SRS
                      </span>
                    </div>
                    <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {summary.dueNowCount} כרטיסיות מוכנות לחזרה כעת
                    </div>
                  </div>
                  <Link
                    href="/flashcards"
                    className="text-xs font-extrabold text-gray-500 hover:text-blue-500 inline-flex items-center gap-1"
                  >
                    <span>עבור לתרגול SRS</span>
                    <ArrowLeft size={13} />
                  </Link>
                </div>

                {/* Metric Card 3: Average FSRS Stability */}
                <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-xs font-extrabold">יציבות FSRS ממוצעת</span>
                    <Sparkles size={18} className="text-emerald-500" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-black text-gray-900 dark:text-white">
                      {summary.avgStability}{' '}
                      <span className="text-base font-bold text-gray-400">ימים</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      קושי ממוצע: {summary.avgDifficulty || '—'} / 10
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">מנוע זיכרון FSRS v4.5</span>
                </div>

                {/* Metric Card 4: Active Output & Dubbing */}
                <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="text-xs font-extrabold">הצלחות פלט אקטיבי ודיבוב</span>
                    <Mic size={18} className="text-indigo-500" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-black text-gray-900 dark:text-white">
                      {summary.totalOutputSuccesses}
                    </div>
                    <div className="text-xs font-bold text-indigo-500 mt-1">
                      {summary.trainerCompletedCount} אתגרי הפקה שהושלמו
                    </div>
                  </div>
                  <Link
                    href="/trainer"
                    className="text-xs font-extrabold text-gray-500 hover:text-indigo-400 inline-flex items-center gap-1"
                  >
                    <span>פתח מאמן פלט ודיבור</span>
                    <ArrowLeft size={13} />
                  </Link>
                </div>
              </section>

              {/* Main Middle Grid: Recharts FSRS Donut/Pie Chart + Breakdown Bars + Gauges */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* FSRS Mastery Distribution (Recharts Donut Chart + Detailed Bars) */}
                <section className="lg:col-span-7 bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-gray-900 dark:text-white">
                        התפלגות שליטה ב-FSRS (Mastery Donut Chart)
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        פילוח חי של כל הכרטיסיות לפי שלב הזיכרון הנוכחי שלהן (`new`, `learning`, `review`, `mastered`)
                      </p>
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {summary.totalCards} מילים
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Recharts Donut Chart */}
                    <div className="md:col-span-5 relative h-56 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={84}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieChartData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              borderRadius: '12px',
                              color: '#f8fafc',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-gray-900 dark:text-white">
                          {summary.totalCards}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">
                          סה״כ מילים
                        </span>
                      </div>
                    </div>

                    {/* Individual Bars */}
                    <div className="md:col-span-7 space-y-3.5">
                      {fsrsRows.map((row) => (
                        <div key={row.key} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: row.hexColor }}
                              />
                              <span>{row.label}</span>
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-lg font-black text-xs shrink-0 ${row.badgeColor}`}
                            >
                              {row.count} ({row.pct}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${row.pct}%` }}
                              className={`h-full rounded-full ${row.barColor} transition-all duration-700`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Retention & Active Output Accuracy Gauges */}
                <section className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">
                      מדדי שימור ודיוק הפקה
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      איכות הזיכרון בחזרות SRS מול הצלחה בהפקת משפטים אקטיבית
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800">
                      <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        <span>אחוז שימור ב-SRS (Retention Rate)</span>
                      </div>
                      <CircularGauge
                        value={summary.retentionRate}
                        colorClass="text-emerald-500"
                        subtitle={
                          summary.totalReviews > 0
                            ? `${summary.passedReviews} שליפות מוצלחות מתוך ${summary.totalReviews} חזרות ביומן review_logs.`
                            : 'טרם נרשמו חזרות ביומן review_logs — בצע חזרה ראשונה ב-/flashcards!'
                        }
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800">
                      <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                        <Mic size={14} />
                        <span>דיוק הפקה אקטיבית (Active Output Accuracy)</span>
                      </div>
                      <CircularGauge
                        value={summary.trainerAccuracyRate}
                        colorClass="text-indigo-500"
                        subtitle={
                          summary.trainerCompletedCount > 0
                            ? `מבוסס על ${summary.trainerCompletedCount} אתגרי כתיבה ודיבור ב-/trainer (${summary.totalOutputSuccesses} חיזוקי פלט).`
                            : 'טרם הושלמו אתגרים במאמן הפלט — נסה להפיק משפט ביפנית ב-/trainer!'
                        }
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* 30-Day Activity Heatmap Grid */}
              <section className="bg-white dark:bg-[#111827] rounded-3xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <CalendarDays size={20} className="text-emerald-500" />
                      <span>מפת חום של 30 ימי הלמידה האחרונים (30-Day Immersion Heatmap)</span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      משלב חזרות SRS, סיפורים, דיאלוגים קוליים, מאמן פלט ופרקי מנגה. לחץ על משבצת יום לפירוט מלא.
                    </p>
                  </div>

                  {/* Intensity Legend */}
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                    <span>פחות</span>
                    {[0, 1, 4, 10, 18].map((lvl) => (
                      <span
                        key={lvl}
                        className={`w-4 h-4 rounded border ${getHeatmapCellColor(lvl)}`}
                      />
                    ))}
                    <span>יותר</span>
                  </div>
                </div>

                {/* 30 Cells Grid */}
                <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2.5" dir="ltr">
                  {summary.heatmap30Days.map((day) => {
                    const isSelected = selectedDay?.date === day.date;
                    const shortDay = day.date.slice(8, 10);
                    return (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDay(day)}
                        title={`${day.date}: ${day.total} פעולות`}
                        className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${getHeatmapCellColor(
                          day.total
                        )} ${isSelected ? 'ring-2 ring-blue-500 scale-105' : 'hover:scale-105'}`}
                      >
                        <span className="text-[10px] font-bold opacity-80">{shortDay}</span>
                        <span className="text-xs font-black">{day.total}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Breakdown Bar */}
                {selectedDay && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="font-black text-gray-900 dark:text-white">
                      פירוט לתאריך <span dir="ltr">{selectedDay.date}</span>: סה״כ{' '}
                      <span className="text-emerald-500">{selectedDay.total}</span> פעולות למידה
                    </div>
                    <div className="flex flex-wrap gap-3 font-bold text-gray-600 dark:text-slate-300">
                      <span>חזרות SRS: {selectedDay.reviews}</span>
                      <span>·</span>
                      <span>כרטיסיות שנכרו: {selectedDay.cardsMined}</span>
                      <span>·</span>
                      <span>סיפורים: {selectedDay.stories}</span>
                      <span>·</span>
                      <span>דיאלוגים: {selectedDay.dialogues}</span>
                      <span>·</span>
                      <span>מאמן פלט: {selectedDay.trainer}</span>
                      <span>·</span>
                      <span>פרקי מנגה: {selectedDay.manga}</span>
                    </div>
                  </div>
                )}
              </section>

              {/* Immersion Library Totals & Backup Info */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/history"
                  className="bg-white dark:bg-[#111827] hover:border-blue-500 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 flex items-center gap-3.5 transition-all"
                >
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                      {summary.libraryTotals.stories}
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-slate-400">
                      סיפורי קריאה בספרייה
                    </div>
                  </div>
                </Link>

                <Link
                  href="/manga"
                  className="bg-white dark:bg-[#111827] hover:border-indigo-500 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 flex items-center gap-3.5 transition-all"
                >
                  <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <ScanEye size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                      {summary.libraryTotals.mangaChapters}
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-slate-400">
                      פרקי מנגה (Vision Studio)
                    </div>
                  </div>
                </Link>

                <Link
                  href="/dialogues"
                  className="bg-white dark:bg-[#111827] hover:border-purple-500 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 flex items-center gap-3.5 transition-all"
                >
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                    <MessagesSquare size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                      {summary.libraryTotals.dialogues}
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-slate-400">
                      דיאלוגים מרובי-דמויות
                    </div>
                  </div>
                </Link>

                <Link
                  href="/dojo"
                  className="bg-white dark:bg-[#111827] hover:border-amber-500 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 flex items-center gap-3.5 transition-all"
                >
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-gray-900 dark:text-white">
                      דוג׳ו קאנה/קאנג׳י
                    </div>
                    <div className="text-xs font-bold text-gray-500 dark:text-slate-400">
                      תרגול קריאה ומהירות
                    </div>
                  </div>
                </Link>
              </section>
            </>
          )
        )}
      </div>
    </div>
  );
}

