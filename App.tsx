import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Languages, 
  ArrowRightLeft, 
  ArrowLeft,
  Copy, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  BookOpen,
  History,
  Settings,
  Search,
  MessageSquare,
  Home,
  ChevronRight,
  TrendingUp,
  Globe,
  Volume2,
  Puzzle,
  Grid3X3,
  PenTool,
  FileText,
  BrainCircuit,
  GraduationCap,
  BookText,
  Quote,
  Layers,
  Zap,
  Target,
  Trophy,
  Flame,
  Lightbulb,
  ArrowRight,
  UserCircle,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import { translateGermanToEnglish, getExampleSentence, generateStudyGuide, getNounGenders, generateQuizQuestions, dictionaryLookup } from './services/geminiService';

type Page = 'home' | 'phrasebook' | 'history' | 'dictionary' | 'solver' | 'academy' | 'homework' | 'settings';

interface HistoryItem {
  id: string;
  german: string;
  english: string;
  timestamp: number;
}

interface SavedWord {
  de: string;
  en: string;
  cat?: string;
  timestamp: number;
}

interface UserProgress {
  wordsLearned: number;
  quizzesCompleted: number;
  streakDays: number;
  dailyGoal: number;
  currentPoints: number;
  lastActive: string;
  theme: 'classic' | 'ocean' | 'forest' | 'midnight';
  savedWords: SavedWord[];
}

const GERMAN_IDIOMS = [
  { de: "Um den heißen Brei herumreden", en: "To beat around the bush", literal: "To talk around the hot porridge" },
  { de: "Ich verstehe nur Bahnhof", en: "I don't understand anything", literal: "I only understand train station" },
  { de: "Da kannst du Gift drauf nehmen", en: "You can bet your life on it", literal: "You can take poison on that" },
  { de: "Die Kirche im Dorf lassen", en: "Let's not get carried away", literal: "To leave the church in the village" }
];

const THEME_CONFIGS = {
  classic: { primary: 'bg-[#E30010]', text: 'text-[#E30010]', shadow: 'shadow-red-500/20', hover: 'hover:bg-[#C2000E]', border: 'border-red-100', accent: 'bg-red-50/30' },
  ocean: { primary: 'bg-[#0070F3]', text: 'text-[#0070F3]', shadow: 'shadow-blue-500/20', hover: 'hover:bg-[#0051B3]', border: 'border-blue-100', accent: 'bg-blue-50/30' },
  forest: { primary: 'bg-[#10B981]', text: 'text-[#10B981]', shadow: 'shadow-emerald-500/20', hover: 'hover:bg-[#059669]', border: 'border-emerald-100', accent: 'bg-emerald-50/30' },
  midnight: { primary: 'bg-zinc-900', text: 'text-zinc-900', shadow: 'shadow-zinc-500/20', hover: 'hover:bg-black', border: 'border-zinc-200', accent: 'bg-zinc-50' }
};

const WORD_OF_THE_DAY = {
  word: "Fernweh",
  type: "Noun",
  definition: "A longing for far-off places. The opposite of homesickness.",
  example: "Ich habe schreckliches Fernweh und muss bald verreisen.",
  translation: "I have terrible wanderlust and need to travel soon."
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isLevelSet, setIsLevelSet] = useState(false);
  const [proficiencyLevel, setProficiencyLevel] = useState<number>(1);
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('german_help_progress');
    const defaults: UserProgress = {
      wordsLearned: 0,
      quizzesCompleted: 0,
      streakDays: 1,
      dailyGoal: 10,
      currentPoints: 0,
      lastActive: new Date().toISOString(),
      theme: 'classic',
      savedWords: []
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      } catch (e) {
        return defaults;
      }
    }
    return defaults;
  });

  const themeConfig = THEME_CONFIGS[progress.theme] || THEME_CONFIGS.classic;

  useEffect(() => {
    localStorage.setItem('german_help_progress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastActiveData = new Date(progress.lastActive).toDateString();
    
    if (today !== lastActiveData) {
      setProgress(prev => {
        const diffDays = Math.floor((new Date(today).getTime() - new Date(lastActiveData).getTime()) / (1000 * 60 * 60 * 24));
        const newStreak = diffDays === 1 ? prev.streakDays + 1 : (diffDays > 1 ? 1 : prev.streakDays);
        
        return {
          ...prev,
          currentPoints: 0, // Reset daily XP
          streakDays: newStreak,
          lastActive: new Date().toISOString()
        };
      });
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const colors = {
      classic: '#E30010',
      ocean: '#0070F3',
      forest: '#10B981',
      midnight: '#18181b'
    };
    root.style.setProperty('--color-brand-red', colors[progress.theme] || colors.classic);
  }, [progress.theme]);

  const addProgress = useCallback((points: number, words: number = 0, quiz: boolean = false) => {
    setProgress(prev => ({
      ...prev,
      currentPoints: prev.currentPoints + points,
      wordsLearned: prev.wordsLearned + words,
      quizzesCompleted: prev.quizzesCompleted + (quiz ? 1 : 0)
    }));
  }, []);

  const [initialDictionaryMode, setInitialDictionaryMode] = useState<'search' | 'flashcards'>('search');

  const addSavedWord = useCallback((de: string, en: string, cat: string = 'General') => {
    setProgress(prev => {
      // Avoid duplicates
      if (prev.savedWords.some(w => w.de.toLowerCase() === de.toLowerCase())) return prev;
      
      const newWord: SavedWord = {
        de,
        en,
        cat,
        timestamp: Date.now()
      };
      
      return {
        ...prev,
        savedWords: [newWord, ...prev.savedWords],
        wordsLearned: prev.wordsLearned + 1,
        currentPoints: prev.currentPoints + 5 // Bonus XP for saving words
      };
    });
  }, []);

  const removeSavedWord = useCallback((de: string) => {
    setProgress(prev => ({
      ...prev,
      savedWords: prev.savedWords.filter(w => w.de !== de)
    }));
  }, []);

  const updateTheme = (newTheme: UserProgress['theme']) => {
    setProgress(p => ({ ...p, theme: newTheme }));
  };

  const updateDailyGoal = (newGoal: number) => {
    setProgress(p => ({ ...p, dailyGoal: newGoal }));
  };
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('de_en_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (de: string, en: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      german: de,
      english: en,
      timestamp: Date.now(),
    };
    const updated = [newItem, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem('de_en_history', JSON.stringify(updated));
  };

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const translation = await translateGermanToEnglish(inputText);
      setOutputText(translation);
      saveToHistory(inputText, translation);
      addProgress(1, 1);
    } catch (err) {
      setError('Translation failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, history]);

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setError(null);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: Page, icon: any, label: string }) => (
    <button
      onClick={() => setCurrentPage(id)}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        currentPage === id 
          ? 'bg-brand-red text-white shadow-lg shadow-red-500/20' 
          : 'text-zinc-500 hover:bg-white hover:text-brand-red'
      }`}
    >
      <Icon className={`w-5 h-5 ${currentPage === id ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );

  if (!isLevelSet) {
    return <LevelSelector onSelect={(lvl) => { setProficiencyLevel(lvl); setIsLevelSet(true); }} />;
  }

  return (
    <div className="flex h-screen bg-brand-gray overflow-hidden relative">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-red/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-brand-gold/5 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] left-[10%] w-px h-[60%] bg-gradient-to-b from-transparent via-zinc-200 to-transparent" />
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-zinc-200 bg-white flex flex-col p-8 hidden lg:flex shadow-[40px_0_60px_-15px_rgba(0,0,0,0.02)] z-50">
        <div className="flex items-center gap-3 mb-10 px-2 transition-transform hover:scale-102 cursor-pointer" onClick={() => setCurrentPage('home')}>
          <div className="bg-brand-red p-2.5 rounded-2xl shadow-lg shadow-red-500/20">
            <Languages className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-zinc-900 leading-none">German Help</h1>
            <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Student Portal</span>
          </div>
        </div>

        <div className="space-y-10 flex-1 overflow-y-auto pr-2 scrollbar-hide">
          <section className="space-y-4">
            <h3 className="px-4 text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Learning Status</h3>
            <div className="mx-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-500 uppercase">XP Collected</span>
                <span className="text-xs font-black text-brand-red">{progress.currentPoints}</span>
              </div>
              <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (progress.currentPoints / progress.dailyGoal) * 100)}%` }}
                  className="h-full bg-brand-red"
                />
              </div>
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">Goal: {progress.dailyGoal} XP today</span>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="px-4 text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Learning Core</h3>
            <div className="space-y-1">
              <NavItem id="home" icon={Zap} label="Dashboard" />
              <NavItem id="dictionary" icon={Search} label="Global Word Bank" />
              <NavItem id="academy" icon={Sparkles} label="Classroom" />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="px-4 text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Practice Labs</h3>
            <div className="space-y-1">
              <NavItem id="homework" icon={GraduationCap} label="Homework Help" />
              <NavItem id="solver" icon={Puzzle} label="Puzzle Solver" />
              <NavItem id="phrasebook" icon={BookOpen} label="Common Phrases" />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="px-4 text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">My Progress</h3>
            <div className="space-y-1">
              <NavItem id="history" icon={History} label="Study Journal" />
            </div>
          </section>
        </div>

        <div className="pt-8 mt-auto border-t border-zinc-100 flex flex-col gap-4">
          <button 
            onClick={() => setCurrentPage('settings')}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-zinc-50 hover:text-brand-red transition-all group"
          >
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            <span className="text-sm font-bold">Preferences</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto relative">
        {/* Mobile Mini Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-zinc-200 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Languages className="text-brand-red w-6 h-6" />
            <span className="font-bold text-zinc-900">German Help 101</span>
          </div>
          <button onClick={() => setCurrentPage('settings')} className={`p-2 rounded-lg ${currentPage === 'settings' ? 'bg-red-50 text-brand-red' : 'text-zinc-500'}`}>
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Contextual Header */}
        <header className="sticky top-0 z-40 bg-brand-gray/80 backdrop-blur-md px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Hub</span>
            <ChevronRight className="w-3 h-3 text-zinc-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-red">
              {currentPage === 'home' ? 'Main Dashboard' : currentPage}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-brand-gray bg-zinc-100 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="user" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 pb-32 lg:pb-12">
          <AnimatePresence mode="wait">
            {currentPage === 'home' && (
              <div className="space-y-16 pb-20">
                {/* Hub Quick Access */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'academy', label: 'Classroom', icon: Sparkles, color: 'text-zinc-900', desc: 'Grammar & Audio' },
                    { id: 'homework', label: 'Homework Help', icon: GraduationCap, color: 'text-brand-red', desc: 'Text Analysis' },
                    { id: 'dictionary', label: 'Global Word Bank', icon: Search, color: 'text-zinc-900', desc: '100k+ Words' },
                    { id: 'phrasebook', label: 'Talk Phrases', icon: BookOpen, color: 'text-brand-gold', desc: 'Real Examples' },
                  ].map((tool) => (
                    <button 
                      key={tool.id}
                      onClick={() => setCurrentPage(tool.id as any)}
                      className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex flex-col items-start gap-4 hover:border-brand-red transition-all group active:scale-95"
                    >
                      <div className={`w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center transition-colors group-hover:bg-brand-red/10`}>
                        <tool.icon className={`w-6 h-6 ${tool.color} transition-colors group-hover:text-brand-red`} />
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-black uppercase tracking-widest text-zinc-900">{tool.label}</span>
                        <span className="block text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-tight">{tool.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Hero Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  <div className="lg:col-span-8">
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.04)] border border-zinc-100 h-full relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-700">
                        <Languages size={280} />
                      </div>
                      <div className="relative z-10 space-y-10">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 rounded-[2rem] bg-brand-red flex items-center justify-center text-white shadow-xl shadow-red-500/20 transition-transform group-hover:scale-110">
                             <TrendingUp className="w-8 h-8" />
                           </div>
                           <div>
                              <h2 className="text-5xl font-black text-zinc-900 tracking-tighter">Your Daily Goal</h2>
                              <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Master {progress.dailyGoal} XP for daily pulse</p>
                           </div>
                        </div>

                        <div className="flex flex-col gap-4">
                           <div className="flex items-center justify-between">
                              <span className="text-sm font-black text-zinc-900 tracking-tight">Daily Progress</span>
                              <span className="text-sm font-black text-brand-red">{Math.min(100, Math.round((progress.currentPoints / progress.dailyGoal) * 100))}%</span>
                           </div>
                           <div className="h-4 bg-zinc-50 rounded-full overflow-hidden border border-zinc-100 p-1">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (progress.currentPoints / progress.dailyGoal) * 100)}%` }}
                                className="h-full bg-brand-red rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6 pt-4">
                           {[
                             { label: 'Learned', val: progress.wordsLearned.toString(), icon: Search },
                             { label: 'Completed', val: progress.quizzesCompleted.toString(), icon: Sparkles },
                             { label: 'Streak', val: `${progress.streakDays}d`, icon: Flame }
                           ].map((stat, i) => (
                             <div key={i} className="space-y-1">
                               <div className="flex items-center gap-2 text-zinc-400 group-hover:text-brand-red transition-colors">
                                 <stat.icon className="w-3 h-3" />
                                 <span className="text-[8px] font-black uppercase tracking-widest">{stat.label}</span>
                               </div>
                               <div className="text-xl font-black text-zinc-900">{stat.val}</div>
                             </div>
                           ))}
                        </div>
                      </div>
                    </div>

                    {/* Daily Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-zinc-900 p-12 rounded-[3.5rem] text-white flex flex-col justify-between min-h-[300px] group transition-all hover:scale-[1.02]">
                          <div>
                             <div className="w-12 h-12 rounded-2xl bg-brand-red flex items-center justify-center mb-8 shadow-lg shadow-red-500/40"><Zap className="w-6 h-6 text-white" /></div>
                             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-4">Mnemonic Shortcut</h4>
                             <p className="text-2xl font-black tracking-tight leading-tight">Focus on word endings: <span className="text-brand-red"> -ung</span> is always feminine.</p>
                          </div>
                          <div className="flex items-center gap-3 pt-8 border-t border-zinc-800">
                             <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Learning Tip #12</span>
                          </div>
                       </div>

                       <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.04)] border border-zinc-100 flex flex-col justify-between min-h-[300px]">
                          <div>
                             <div className="flex items-center gap-2 mb-8">
                                <Trophy className="w-5 h-5 text-brand-gold" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Culture Fact</span>
                             </div>
                             <p className="text-2xl font-black text-zinc-900 tracking-tight leading-tight">German is official in <span className="text-brand-red">6 countries</span>.</p>
                          </div>
                          <p className="text-xs text-zinc-400 font-medium leading-relaxed">Germany, Austria, Switzerland, Liechtenstein, Belgium, and Luxembourg.</p>
                       </div>
                    </div>

                    {/* Achievement Board */}
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.04)] border border-zinc-100 flex flex-col gap-8">
                       <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-zinc-900 tracking-tighter">Achievements</h3>
                          <Trophy className="w-5 h-5 text-brand-gold" />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { title: 'Early Bird', icon: Zap, req: 10, val: progress.currentPoints, desc: '10 XP in one day' },
                            { title: 'Article Ace', icon: ShieldCheck, req: 5, val: progress.wordsLearned, desc: 'Master 5 articles' },
                            { title: 'Quiz Master', icon: Sparkles, req: 1, val: progress.quizzesCompleted, desc: 'Finish 1 quiz' },
                            { title: 'Consistency', icon: Flame, req: 3, val: progress.streakDays, desc: '3 day streak' }
                          ].map((ach, i) => (
                            <div key={i} className={`p-6 rounded-[2rem] border transition-all ${ach.val >= ach.req ? 'bg-zinc-900 border-zinc-800 text-white shadow-xl' : 'bg-zinc-50 border-zinc-100 text-zinc-400 opacity-60'}`}>
                               <div className="flex items-start justify-between mb-4">
                                  <div className={`p-3 rounded-xl ${ach.val >= ach.req ? 'bg-brand-red text-white' : 'bg-white text-zinc-300 shadow-sm'}`}>
                                     {typeof ach.icon === 'string' ? <Zap className="w-4 h-4"/> : <ach.icon className="w-4 h-4" />}
                                  </div>
                                  {ach.val >= ach.req && <div className="bg-brand-gold text-zinc-900 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Unlocked</div>}
                               </div>
                               <h4 className={`text-sm font-black mb-1 ${ach.val >= ach.req ? 'text-white' : 'text-zinc-900'}`}>{ach.title}</h4>
                               <p className="text-[10px] font-bold opacity-60">{ach.desc}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                  
                  <div className="lg:col-span-4 flex flex-col gap-8">
                    <div className="bg-brand-red p-10 rounded-[3rem] shadow-xl shadow-red-500/20 flex flex-col justify-between group cursor-pointer overflow-hidden relative min-h-[180px]" onClick={() => setCurrentPage('academy')}>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <Sparkles className="text-white w-10 h-10 mb-4" />
                        <h3 className="text-2xl font-black text-white tracking-tighter leading-tight">Master <br/>the Articles</h3>
                      </div>
                      <div className="flex items-center gap-2 text-white font-black uppercase tracking-[0.2em] text-[10px] relative z-10 mt-4">
                        Training Mode
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                      </div>
                    </div>

                    <div className="bg-zinc-900 p-10 rounded-[3rem] shadow-xl flex flex-col justify-between group cursor-pointer overflow-hidden relative min-h-[180px]" onClick={() => { setInitialDictionaryMode('flashcards'); setCurrentPage('dictionary'); }}>
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <BookText className="text-brand-gold w-10 h-10 mb-4" />
                        <h3 className="text-2xl font-black text-white tracking-tighter leading-tight">Global Word Bank <br/>Flashcards</h3>
                      </div>
                      <div className="flex items-center gap-2 text-brand-gold font-black uppercase tracking-[0.2em] text-[10px] relative z-10 mt-4">
                        {progress.savedWords.length > 0 ? `${progress.savedWords.length} words saved` : 'Memorize Now'}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grammar Visualizer Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-12">
                    <GrammarVisualizer />
                  </div>
                </div>

                {/* Quick Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <IdiomGallery />
                  
                  <div className="md:col-span-1 bg-white p-10 rounded-[3rem] shadow-sm border border-zinc-100 space-y-8">
                    <h4 className="text-xl font-bold flex items-center gap-3">
                      <Target className="w-5 h-5 text-zinc-400" />
                      Daily Goals
                    </h4>
                    <div className="space-y-6">
                      {[
                        { label: '5 new words', done: true, progress: 100 },
                        { label: '10 min listening', done: false, progress: 40 },
                        { label: 'Perfect quiz score', done: false, progress: 0 }
                      ].map((goal, i) => (
                        <div key={i} className="space-y-2 group cursor-pointer">
                          <div className="flex items-center justify-between font-bold text-sm">
                            <span className={goal.done ? 'text-zinc-400' : 'text-zinc-900 group-hover:text-brand-red transition-colors'}>{goal.label}</span>
                            <span className="text-xs text-zinc-300 font-mono">{goal.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-50 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${goal.progress}%` }}
                              className="h-full bg-brand-red"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setCurrentPage('home')} // Link to translator or specific goal
                      className="w-full flex items-center justify-center p-4 bg-zinc-50 rounded-2xl text-zinc-400 group hover:bg-zinc-900 hover:text-white transition-all overflow-hidden relative"
                    >
                      <Trophy className="w-4 h-4 group-hover:-translate-y-12 transition-transform" />
                      <span className="font-bold absolute translate-y-12 group-hover:translate-y-0 transition-transform">Resume Training</span>
                    </button>
                  </div>
                </div>

                {/* Quick Reference Section */}
                <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-zinc-100">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-bold tracking-tight">Rapid Translator</h3>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                       <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Engine Online</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 space-y-4">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Geben Sie hier Text ein..."
                        className="w-full h-40 bg-zinc-50 border-none rounded-3xl p-8 text-lg focus:outline-none focus:ring-4 focus:ring-brand-gold/20 transition-all resize-none placeholder:text-zinc-200"
                      />
                      <button
                        onClick={handleTranslate}
                        disabled={isLoading || !inputText.trim()}
                        className="w-full bg-brand-black text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-xl border border-white/10"
                      >
                        {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5 text-brand-gold" />}
                        Translate Instantly
                      </button>
                    </div>
                    
                    <div className="lg:col-span-2 flex items-center justify-center h-full hidden lg:flex pt-16">
                       <ArrowRightLeft className="w-8 h-8 text-zinc-100" />
                    </div>

                    <div className="lg:col-span-5 relative">
                      <div className={`w-full min-h-[160px] bg-zinc-50 border border-zinc-100 rounded-3xl p-8 text-lg ${!outputText && 'text-zinc-300 italic'}`}>
                        {isLoading ? "Synthesizing..." : outputText || "Engine standby."}
                      </div>
                      {outputText && (
                        <div className="absolute bottom-4 right-4 flex gap-2">
                          <button 
                            onClick={() => addSavedWord(inputText, outputText, 'Translation')}
                            className={`p-3 shadow-lg rounded-xl transition-all ${progress.savedWords.some(w => w.de === inputText) ? 'bg-brand-red text-white' : 'bg-white text-zinc-400 hover:text-brand-red'}`}
                            title="Save to Bank"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleCopy(outputText)}
                            className="p-3 bg-white shadow-lg rounded-xl text-zinc-400 hover:text-brand-red transition-all"
                            title="Copy to Clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentPage === 'academy' && <Academy proficiencyLevel={proficiencyLevel} addProgress={addProgress} />}

            {currentPage === 'homework' && <HomeworkLab proficiencyLevel={proficiencyLevel} />}

            {currentPage === 'solver' && <WordSearchSolver />}

            {currentPage === 'phrasebook' && (
              <motion.div
                key="phrasebook"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-bold text-zinc-900 tracking-tighter">Linguistic Blueprints</h2>
                  <p className="text-zinc-500 font-medium">Commonly deployed patterns for professional engagement.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { cat: 'Essentials', items: [['Guten Morgen', 'Good Morning'], ['Entschuldigung', 'Excuse Me'], ['Bitte sehr', 'You\'re welcome']] },
                    { cat: 'Navigation', items: [['Wo ist...', 'Where is...'], ['Geradeaus', 'Straight ahead'], ['Links abbiegen', 'Turn left']] },
                    { cat: 'Engagement', items: [['Wie geht es?', 'How are you?'], ['Freut mich', 'Nice to meet you'], ['Gute Reise', 'Have a good trip']] },
                  ].map((category, idx) => (
                    <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-zinc-100/50 space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-brand-red"><MessageSquare className="w-6 h-6" /></div>
                        <h3 className="font-bold text-xl text-zinc-900">{category.cat}</h3>
                      </div>
                      <div className="space-y-6">
                        {category.items.map(([de, en], i) => (
                          <div key={i} className="group border-l-2 border-zinc-50 pl-6 hover:border-brand-red transition-all cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="text-base font-bold text-zinc-800">{de}</span>
                              <Volume2 className="w-4 h-4 text-zinc-200 group-hover:text-brand-red transition-colors" />
                            </div>
                            <span className="text-sm text-zinc-400 font-medium group-hover:text-zinc-600">{en}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentPage === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-bold text-zinc-900 tracking-tighter">Activity Log</h2>
                  <p className="text-zinc-500 font-medium">A temporal record of your cross-language operations.</p>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] overflow-hidden border border-zinc-100">
                  {history.length === 0 ? (
                    <div className="p-24 text-center flex flex-col items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-200"><History className="w-10 h-10" /></div>
                      <p className="text-zinc-400 font-medium tracking-tight">Empty session. New data will appear as you translate.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-50">
                      {history.map((item) => (
                        <div key={item.id} className="p-10 hover:bg-zinc-50/50 transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-10">
                            <div className="text-[10px] font-mono text-zinc-300 rotate-90 w-12">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="flex flex-col">
                              <span className="text-lg font-bold text-zinc-900 leading-tight">{item.german}</span>
                              <span className="text-base text-brand-red font-medium">{item.english}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleCopy(item.english)} className="p-3 bg-zinc-100 rounded-xl text-zinc-500 hover:text-brand-red hover:bg-white hover:shadow-lg transition-all"><Copy className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentPage === 'dictionary' && (
              <DictionaryPage 
                proficiencyLevel={proficiencyLevel} 
                initialMode={initialDictionaryMode}
                savedWords={progress.savedWords}
                onSave={addSavedWord}
                onRemove={removeSavedWord}
              />
            )}

            {currentPage === 'settings' && (
              <motion.div key="settings" className="max-w-3xl mx-auto space-y-16">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-bold text-zinc-900 tracking-tighter">System Configuration</h2>
                  <p className="text-zinc-500 font-medium">Global parameters for your linguistic workspace.</p>
                </div>
                
                <div className="space-y-10">
                  <section className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-300">Preferences</h3>
                    <div className="bg-white rounded-[2.5rem] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.03)] divide-y divide-zinc-50 border border-zinc-100">
                      {[
                        { title: 'Cloud Persistence', desc: 'Sync history across all authorized nodes.', active: true },
                        { title: 'Neural Optimization', desc: 'Accelerate response time via local edge caching.', active: true },
                        { title: 'Dark Protocol', desc: 'Invert workspace luminosity for low-light conditions.', active: false },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-8">
                          <div className="max-w-md">
                            <h4 className="font-bold text-zinc-900">{item.title}</h4>
                            <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1">{item.desc}</p>
                          </div>
                          <button className={`w-14 h-8 rounded-full transition-all relative ${item.active ? 'bg-brand-red shadow-lg shadow-red-500/30' : 'bg-zinc-100'}`}>
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${item.active ? 'right-1' : 'left-1'}`}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-300">Personalization</h3>
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-zinc-100 space-y-10">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-bold text-zinc-900 mb-2">Visual Theme</h4>
                          <p className="text-xs text-zinc-400 font-medium">Select your preferred accent color for the interface.</p>
                        </div>
                        <div className="flex gap-4">
                          {(Object.keys(THEME_CONFIGS) as Array<keyof typeof THEME_CONFIGS>).map((t) => (
                            <button 
                              key={t}
                              onClick={() => updateTheme(t)}
                              className={`w-14 h-14 rounded-2xl transition-all border-4 ${
                                progress.theme === t ? 'border-zinc-900 scale-110 shadow-lg' : 'border-transparent'
                              } ${THEME_CONFIGS[t].primary}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="pt-10 border-t border-zinc-50 space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-zinc-900">Daily XP Goal</h4>
                            <p className="text-xs text-zinc-400 font-medium">Set your target points for daily progress tracking.</p>
                          </div>
                          <span className={`${themeConfig.text} text-2xl font-black`}>{progress.dailyGoal} XP</span>
                        </div>
                        <input 
                          type="range" 
                          min="5" 
                          max="100" 
                          step="5"
                          value={progress.dailyGoal}
                          onChange={(e) => updateDailyGoal(parseInt(e.target.value))}
                          className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-brand-red"
                        />
                        <div className="flex justify-between text-[10px] font-black uppercase text-zinc-300">
                          <span>Casual (5)</span>
                          <span>Hardcore (100)</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-300">Learning Level</h3>
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-zinc-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-zinc-900">Current AI Difficulty</h4>
                          <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1">Adjusts word complexity and quiz difficulty (1-10).</p>
                        </div>
                        <span className="text-2xl font-black text-brand-red">Level {proficiencyLevel}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => (
                          <button 
                            key={lvl}
                            onClick={() => setProficiencyLevel(lvl)}
                            className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${proficiencyLevel === lvl ? 'bg-brand-red text-white shadow-lg' : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-300">Data Management</h3>
                    <div className="bg-red-50/30 p-10 rounded-[2.5rem] border border-red-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-red-900">Atomic Reset</h4>
                        <p className="text-xs text-red-600/60 font-medium">Permanently erase all local session records.</p>
                      </div>
                      <button 
                        onClick={() => { localStorage.clear(); setHistory([]); }}
                        className="bg-red-600 text-white font-bold px-8 py-3 rounded-2xl shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95"
                      >
                        Reset Data
                      </button>
                    </div>
                  </section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Navigation Dock */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-3xl border border-zinc-200/50 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] flex justify-around items-center h-24 px-4 z-[100]">
          {[
            { id: 'home', icon: Zap, label: 'Dash' },
            { id: 'dictionary', icon: Search, label: 'Words' },
            { id: 'homework', icon: GraduationCap, label: 'Tutor' },
            { id: 'academy', icon: Sparkles, label: 'Class' },
            { id: 'phrasebook', icon: BookOpen, label: 'Talk' },
          ].map(({ id, icon: Icon, label }) => (
            <button 
              key={id}
              onClick={() => setCurrentPage(id as any)}
              className="flex flex-col items-center gap-1.5 min-w-[56px] transition-all"
            >
              <div 
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                  currentPage === id 
                    ? 'bg-brand-red text-white shadow-lg shadow-red-500/20 scale-110' 
                    : 'text-zinc-300 hover:text-zinc-500'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span 
                className={`text-[8px] font-black uppercase tracking-widest transition-colors ${
                  currentPage === id ? 'text-brand-red opacity-100' : 'text-zinc-400 opacity-60'
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function Academy({ proficiencyLevel, addProgress }: { proficiencyLevel: number; addProgress: (p: number, w?: number, q?: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<'conjugator' | 'trainer' | 'quiz' | 'guides'>('guides');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-12"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-zinc-900 tracking-tighter">Academic Mastery</h2>
          <p className="text-zinc-500 font-medium">Cognitive training modules specifically tuned for Level {proficiencyLevel}.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-zinc-100 self-start overflow-x-auto max-w-full">
          {[
            { id: 'guides', label: 'Lessons' },
            { id: 'trainer', label: 'Articles' },
            { id: 'quiz', label: 'Final Test' },
            { id: 'conjugator', label: 'Verbs' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-brand-red text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'guides' && <LinguisticGuides key="guides" level={proficiencyLevel} />}
        {activeTab === 'conjugator' && <VerbConjugator key="conjugator" />}
        {activeTab === 'trainer' && <GenderTrainer key="trainer" proficiencyLevel={proficiencyLevel} addProgress={addProgress} />}
        {activeTab === 'quiz' && <VocabularyQuiz key="quiz" proficiencyLevel={proficiencyLevel} addProgress={addProgress} />}
      </AnimatePresence>
    </motion.div>
  );
}

function LinguisticGuides({ level }: { level: number; key?: string }) {
  const [topic, setTopic] = useState('');

  const guidesByLevel: Record<string, Record<string, any>> = {
    "1": {
      basics: {
        title: "School & Study",
        desc: "Essential vocabulary for the classroom environment.",
        photo: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800",
        content: [
          "Die Schule (School) - Ich gehe zur Schule.",
          "Der Lehrer (Teacher) - Der Lehrer ist nett.",
          "Das Buch (Book) - Das Buch ist interessant.",
          "Mathematik (Math) - Mathe ist schwer.",
          "Hausaufgaben (Homework) - Ich mache Hausaufgaben."
        ],
        video: "https://www.youtube.com/embed/fA-JAsQNo2A"
      },
      time: {
        title: "Telling Time",
        desc: "Learn to express hours, minutes, and schedules.",
        photo: "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&q=80&w=800",
        content: [
          "Wie spät ist es? (What time is it?)",
          "Es ist ein Uhr. (It's one o'clock.)",
          "Viertel vor/nach (Quarter to/after)",
          "Halb acht (Half past seven - lit. 'half eight')",
          "Morgens, Mittags, Abends (Morning, Noon, Evening)"
        ],
        video: "https://www.youtube.com/embed/5mSId-Z8uAs"
      }
    },
    "3": {
      travel: {
        title: "Travel & Transit",
        desc: "Navigating trains, planes, and cities.",
        photo: "https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&q=80&w=800",
        content: [
          "Der Bahnhof (Train Station)",
          "Ein Ticket kaufen (To buy a ticket)",
          "Gleis sieben (Platform seven)",
          "Der Zug hat Verspätung (The train is delayed)",
          "Entschuldigung, wo ist...? (Excuse me, where is...?)"
        ],
        video: "https://www.youtube.com/embed/RAnZ5E11S18"
      },
      food: {
        title: "German Cuisine",
        desc: "Ordering in restaurants and food culture.",
        photo: "https://images.unsplash.com/photo-1599321955419-78a0f0fa47c0?auto=format&fit=crop&q=80&w=800",
        content: [
          "Die Speisekarte (The menu)",
          "Ich hätte gerne... (I would like...)",
          "Die Rechnung, bitte (The bill, please)",
          "Guten Appetit! (Enjoy your meal!)",
          "Zahlen Sie bar oder mit Karte? (Cash or card?)"
        ]
      }
    },
    "7": {
      politics: {
        title: "Society & Politics",
        desc: "Discussing current events and news in German.",
        photo: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&q=80&w=800",
        content: [
          "Die Bundesregierung (Federal Government)",
          "Die Bundestagswahl (Federal Election)",
          "Gesetze verabschieden (To pass laws)",
          "Öffentliche Meinung (Public opinion)",
          "Nachhaltigkeit (Sustainability)"
        ],
        video: "https://www.youtube.com/embed/j_Nn2NnK0rY"
      },
      literature: {
        title: "Literary Giants",
        desc: "Goethe, Schiller, and the depth of German prose.",
        photo: "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?auto=format&fit=crop&q=80&w=800",
        content: [
          "Faust von Goethe (Goethe's Faust)",
          "Dichter und Denker (Poets and thinkers)",
          "Symbolik in der Lyrik (Symbolism in poetry)",
          "Klassische Epoche (Classical era)",
          "Interpretationsansätze (Interpretive approaches)"
        ],
        video: "https://www.youtube.com/embed/fA-JAsQNo2A"
      }
    },
    "default": {
      logic: {
        title: "Deep Grammar",
        desc: "Advanced logic and complex linguistic structures.",
        photo: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=800",
        content: [
          "Subjunctive II (Konjunktiv II) for hypothetical situations.",
          "Passive Voice constructions (Passiv mit werden).",
          "Complex prepositions requiring Genitive case.",
          "Relative clauses with nested information."
        ],
        video: "https://www.youtube.com/embed/RAnZ5E11S18"
      },
      idioms: {
        title: "Fluency & Idioms",
        desc: "Natural phrasing and cultural expressions.",
        photo: "https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&q=80&w=800",
        content: [
          "Das ist mir Wurst! (I don't care!)",
          "Nur Bahnhof verstehen (To understand nothing)",
          "Die Daumen drücken (To cross fingers/wish luck)",
          "Formal vs. Informal register shifts."
        ],
        video: "https://www.youtube.com/embed/5aUf8r656h8"
      }
    }
  };

  const levelGuides = (guidesByLevel[level.toString()] || guidesByLevel.default) as Record<string, any>;
  const currentKey = topic || Object.keys(levelGuides)[0];
  const current = levelGuides[currentKey];

  useEffect(() => {
    if (!levelGuides[topic]) setTopic(Object.keys(levelGuides)[0]);
  }, [level, levelGuides, topic]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div className="lg:col-span-4 space-y-4">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 block mb-6">Course Modules (LVL {level})</span>
        <div className="space-y-4">
          {Object.entries(levelGuides).map(([id, g]) => (
            <button
              key={id}
              onClick={() => setTopic(id)}
              className={`w-full p-8 rounded-[2.5rem] text-left transition-all border ${
                currentKey === id ? 'bg-white border-brand-red shadow-xl shadow-red-500/5' : 'bg-white/50 border-zinc-100 opacity-60 hover:opacity-100 shadow-sm'
              }`}
            >
              <h4 className="font-black text-zinc-900 tracking-tight">{g.title}</h4>
              <p className="text-[10px] font-bold text-zinc-400 mt-2 uppercase tracking-tight line-clamp-1">{g.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="lg:col-span-8 space-y-12">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-zinc-100 space-y-10">
          <div className="relative h-72 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <img src={current.photo} alt={current.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-12 flex items-end">
              <div>
                <span className="bg-brand-red text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Active Unit</span>
                <h3 className="text-5xl font-black text-white tracking-tighter">{current.title}</h3>
              </div>
            </div>
          </div>
          
          <p className="text-xl font-bold text-zinc-600 leading-relaxed tracking-tight">{current.desc}</p>
          
          <div className="space-y-6">
            {current.content.map((item: string, i: number) => (
              <div key={i} className="flex gap-6 p-8 bg-zinc-50 rounded-[2rem] border border-zinc-100 group hover:border-brand-red transition-all">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-[10px] font-black text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all">{i + 1}</div>
                <p className="text-zinc-700 leading-relaxed font-bold">{item}</p>
              </div>
            ))}
          </div>

          {current.video && (
            <div className="pt-8 border-t border-zinc-100">
              <div className="flex items-center gap-2 mb-8">
                <Trophy className="w-4 h-4 text-brand-gold" />
                <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expert Explanation Video</h5>
              </div>
              <div className="aspect-video rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={current.video} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function VerbConjugator() {
  const [verb, setVerb] = useState('');
  const [conjugations, setConjugations] = useState<any>(null);
  const [isL, setIsL] = useState(false);

  const handleConjugate = async () => {
    if (!verb.trim()) return;
    setIsL(true);
    try {
      // Mocking for now, could use Gemini for real conjugation
      const data = {
        present: [
          { p: 'Ich', v: verb.endsWith('en') ? verb.slice(0, -2) + 'e' : verb + 'e' },
          { p: 'Du', v: verb.endsWith('en') ? verb.slice(0, -2) + 'st' : verb + 'st' },
          { p: 'Er/Sie/Es', v: verb.endsWith('en') ? verb.slice(0, -2) + 't' : verb + 't' },
          { p: 'Wir', v: verb },
          { p: 'Ihr', v: verb.endsWith('en') ? verb.slice(0, -2) + 't' : verb + 't' },
          { p: 'Sie/sie', v: verb }
        ]
      };
      setConjugations(data);
    } finally {
      setIsL(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-12 gap-8">
      <div className="md:col-span-4 space-y-6">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-zinc-100 space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">German Verb</label>
            <input
              type="text"
              value={verb}
              onChange={(e) => setVerb(e.target.value)}
              placeholder="e.g. machen, laufen..."
              className="w-full bg-zinc-50 border-none rounded-2xl px-6 py-4 text-lg focus:ring-4 focus:ring-brand-gold/20 transition-all"
            />
          </div>
          <button
            onClick={handleConjugate}
            disabled={isL || !verb.trim()}
            className="w-full bg-brand-red text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-3"
          >
            {isL ? <Loader2 className="animate-spin w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            Conjugate
          </button>
        </div>
      </div>
      <div className="md:col-span-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-zinc-100 min-h-[400px] flex items-center justify-center">
          {conjugations ? (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
              {conjugations.present.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <span className="text-zinc-400 font-bold text-xs uppercase tracking-widest">{item.p}</span>
                  <span className="text-xl font-bold text-zinc-900">{item.v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center space-y-4 opacity-30">
              <TrendingUp className="w-12 h-12 mx-auto" />
              <p className="font-medium">Enter a verb to see its present tense transformations.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function GenderTrainer({ proficiencyLevel, addProgress }: { proficiencyLevel: number; key?: string; addProgress: (p: number, w?: number) => void }) {
  const [words, setWords] = useState<{ word: string; gender: string; en: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWords = useCallback(async () => {
    setIsLoading(true);
    try {
      const newWords = await getNounGenders(proficiencyLevel);
      setWords(newWords);
      setCurrentIndex(0);
    } finally {
      setIsLoading(false);
    }
  }, [proficiencyLevel]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const handleGuess = (gender: string) => {
    if (feedback) return;
    const current = words[currentIndex];
    
    if (gender === current.gender) {
      setFeedback('correct');
      const newScore = score + 1;
      setScore(newScore);
      if (newScore > bestStreak) setBestStreak(newScore);
      addProgress(1, 1); // 1 point per correct answer, 1 word learned
    } else {
      setFeedback('wrong');
      setScore(0); // Reset score on mistake as requested
    }
    
    setTimeout(() => {
      setFeedback(null);
      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        fetchWords();
      }
    }, 1200);
  };

  if (isLoading && words.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin w-10 h-10 text-brand-red opacity-20" />
      </div>
    );
  }

  const currentWord = words[currentIndex] || { word: '...', gender: '', en: '' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto space-y-12 py-12">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-1 flex-1 bg-zinc-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-brand-red" 
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-zinc-300 uppercase tabular-nums">{currentIndex + 1} / {words.length}</span>
        </div>
        
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">Article Mastery</div>
        <h3 className="text-7xl font-black text-zinc-900 tracking-tighter lowercase">{currentWord.word}</h3>
        <p className="text-zinc-400 font-medium italic">{currentWord.en}</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {['der', 'die', 'das'].map((gender) => (
          <button
            key={gender}
            onClick={() => handleGuess(gender)}
            className={`group relative py-10 rounded-[2.5rem] font-black text-2xl shadow-xl transition-all active:scale-95 overflow-hidden ${
              feedback === 'correct' && gender === currentWord.gender ? 'bg-green-500 text-white shadow-green-500/20' :
              feedback === 'wrong' && gender === currentWord.gender ? 'bg-green-50/50 text-green-600 border-2 border-green-500 shadow-none' :
              feedback === 'wrong' && gender !== currentWord.gender ? 'bg-zinc-100 text-zinc-300 opacity-40 grayscale pointer-events-none' :
              'bg-white text-zinc-900 border border-zinc-100 hover:border-brand-red hover:text-brand-red'
            }`}
          >
            {gender}
          </button>
        ))}
      </div>

      <div className="flex justify-center flex-col items-center gap-4">
        <div className="flex items-center gap-3 bg-zinc-900 text-white px-8 py-3 rounded-full shadow-xl">
          <Trophy className="w-5 h-5 text-brand-gold" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Current Streak</span>
            <span className="text-xl font-black tracking-widest uppercase tabular-nums leading-none">{score}</span>
          </div>
          <div className="w-px h-6 bg-white/20 mx-2" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Best Streak</span>
            <span className="text-xl font-black tracking-widest uppercase tabular-nums leading-none text-brand-gold">{bestStreak}</span>
          </div>
        </div>
        {feedback === 'wrong' && (
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xs font-black text-brand-red uppercase tracking-widest"
          >
            Mistake! Streak reset.
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

function VocabularyQuiz({ proficiencyLevel, addProgress }: { proficiencyLevel: number; key?: string; addProgress: (p: number, w?: number, q?: boolean) => void }) {
  const [quiz, setQuiz] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState(0);

  const fetchQuiz = useCallback(async () => {
    setIsLoading(true);
    try {
      const questions = await generateQuizQuestions(proficiencyLevel);
      setQuiz(questions);
      setCurrentIndex(0);
    } catch (e) {
      console.error(e);
      setQuiz([{ question: 'Failed to load quiz. Try again?', options: ['Yes'], answer: 'Yes' }]);
    } finally {
      setIsLoading(false);
    }
  }, [proficiencyLevel]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const check = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const correct = opt === quiz[currentIndex].answer;
    setIsCorrect(correct);
    if (correct) {
      setScore(s => s + 1);
      addProgress(2); // 2 points per correct quiz answer
    }

    setTimeout(() => {
      if (currentIndex < quiz.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelected(null);
        setIsCorrect(null);
      } else if (currentIndex === quiz.length - 1) {
        addProgress(5, 0, true); // Bonus for finishing quiz
      }
    }, 1500);
  };

  if (isLoading && quiz.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin w-10 h-10 text-brand-red opacity-20" />
      </div>
    );
  }

  const q = quiz[currentIndex] || { question: '', options: [], answer: '' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-12 py-12">
      <div className="flex items-center justify-between px-6">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">Phase {currentIndex + 1} / {quiz.length}</span>
        <div className="flex items-center gap-2">
          <Trophy className="w-3 h-3 text-brand-gold" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900">{score} Points</span>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] border border-zinc-100 space-y-10 relative overflow-hidden">
        {selected && (
          <motion.div 
            initial={{ scaleX: 0 }} 
            animate={{ scaleX: 1 }} 
            transition={{ duration: 1.5 }}
            className={`absolute top-0 left-0 right-0 h-1 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`} 
          />
        )}
        
        <h3 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight">{q.question}</h3>
        <div className="grid grid-cols-1 gap-4">
          {q.options.map((opt: string) => (
            <button
              key={opt}
              disabled={!!selected}
              onClick={() => check(opt)}
              className={`p-6 rounded-2xl text-left font-bold border-2 transition-all relative overflow-hidden group ${
                selected === opt 
                  ? (opt === q.answer ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700')
                  : selected && opt === q.answer
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-zinc-50 border-transparent hover:border-zinc-200 text-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{opt}</span>
                {selected === opt && (
                  isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Trash2 className="w-5 h-5 text-red-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {currentIndex === quiz.length - 1 && selected && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={fetchQuiz}
          className="w-full bg-zinc-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-zinc-200"
        >
          Next Mastery Level
        </motion.button>
      )}
    </motion.div>
  );
}

function HomeworkLab({ proficiencyLevel }: { proficiencyLevel: number }) {
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeTool, setActiveTool] = useState<'proof' | 'summary' | 'vocab' | 'study'>('vocab');
  const [isL, setIsL] = useState(false);
  const [studyGuideData, setStudyGuideData] = useState<any[]>([]);

  const runAnalysis = async () => {
    if (!inputText.trim()) return;
    setIsL(true);
    try {
      if (activeTool === 'study') {
        const guide = await generateStudyGuide(inputText, proficiencyLevel);
        setStudyGuideData(guide);
      } else {
        // Mocking analysis for other tools
        setTimeout(() => {
          setAnalysis({
            proof: "Grammar analysis performed for level " + proficiencyLevel + ". Consider more complex structures.",
            summary: "Summary of provided text focused on key themes.",
            vocab: [
              { word: "Analyse", type: "Noun", en: "Analysis" }
            ]
          });
        }, 1000);
      }
    } finally {
      setIsL(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-20">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-bold text-zinc-900 tracking-tighter">Academic Homework Lab</h2>
        <p className="text-zinc-500 font-medium max-w-xl">Intelligent synthesis and error detection (Level {proficiencyLevel}).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-12 flex flex-wrap gap-4">
          {[
            { id: 'vocab', icon: BrainCircuit, label: 'Vocab Miner' },
            { id: 'study', icon: ClipboardList, label: 'Study Guide' },
            { id: 'proof', icon: PenTool, label: 'Grammar Proofing' },
            { id: 'summary', icon: FileText, label: 'Text Summarizer' }
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as any)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                activeTool === tool.id ? 'bg-zinc-900 text-white shadow-xl' : 'bg-white text-zinc-500 border border-zinc-100 hover:bg-zinc-50'
              }`}
            >
              <tool.icon className="w-4 h-4" />
              {tool.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-1 rounded-[2.5rem] shadow-sm border border-zinc-100">
            <div className="p-8 pb-4 flex gap-2 flex-wrap">
              {proficiencyLevel === 1 && [
                { label: 'School List', val: 'Schule, Lehrer, Buch, Mathematik' },
                { label: 'Colors', val: 'Rot, Blau, Grün, Gelb' },
                { label: 'Time', val: 'Morgens, Mittags, Abends, Nacht' }
              ].map((sample) => (
                <button 
                  key={sample.label}
                  onClick={() => setInputText(sample.val)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-50 text-[10px] font-black uppercase text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-all border border-zinc-100"
                >
                  + {sample.label}
                </button>
              ))}
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={activeTool === 'study' ? "Enter words separated by commas (e.g. Haus, Hund, Auto)" : "Paste your essay or text here..."}
              className="w-full h-80 bg-transparent border-none rounded-[2.2rem] p-10 text-lg focus:outline-none resize-none placeholder:text-zinc-200"
            />
            <div className="p-6 pt-0">
              <button
                onClick={runAnalysis}
                disabled={isL || !inputText.trim()}
                className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-bold tracking-wide hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-30"
              >
                {isL ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5 text-brand-gold" />}
                {activeTool === 'study' ? 'Generate Guide' : 'Analyze Text'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-zinc-900 text-white rounded-[3rem] p-12 h-full shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              {activeTool === 'proof' && <PenTool size={200} />}
              {activeTool === 'summary' && <FileText size={200} />}
              {activeTool === 'vocab' && <BrainCircuit size={200} />}
              {activeTool === 'study' && <ClipboardList size={200} />}
            </div>

            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
              {activeTool === 'proof' ? 'Diagnostic Feedback' : activeTool === 'summary' ? 'Cognitive Summary' : activeTool === 'vocab' ? 'Vocabulary Insights' : 'AI Study Guide'}
            </h3>

            <div className="space-y-8 relative z-10">
              {isL ? (
                <div className="flex flex-col gap-4">
                  <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse"></div>
                  <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse"></div>
                </div>
              ) : activeTool === 'study' && studyGuideData.length > 0 ? (
                <div className="grid gap-6 max-h-[500px] overflow-y-auto pr-4 scrollbar-hide">
                  {studyGuideData.map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.article && <span className="text-brand-gold font-black uppercase text-[10px] tracking-widest">{item.article}</span>}
                          <h4 className="text-2xl font-bold">{item.word}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{item.type}</span>
                      </div>
                      <div className="space-y-2">
                         <p className="text-lg text-zinc-200">"{item.example}"</p>
                         <p className="text-xs text-zinc-500 italic">{item.translation}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : analysis ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {activeTool === 'proof' && (
                    <div className="text-zinc-200 leading-relaxed text-lg border-l-2 border-brand-red pl-6 italic">
                      {analysis.proof}
                    </div>
                  )}
                  {activeTool === 'summary' && (
                    <div className="text-zinc-300 space-y-4">
                      <p className="text-lg leading-relaxed font-medium text-white">{analysis.summary}</p>
                      <div className="pt-4 flex gap-3 flex-wrap">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-400">Formal Tone</span>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-400">Level {proficiencyLevel}+</span>
                      </div>
                    </div>
                  )}
                  {activeTool === 'vocab' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {analysis.vocab.map((v: any, i: number) => (
                        <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold">{v.type}</span>
                            <ArrowRightLeft className="w-3 h-3 text-zinc-600" />
                          </div>
                          <div className="text-lg font-bold">{v.word}</div>
                          <div className="text-sm text-zinc-500">{v.en}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-20">
                  <GraduationCap size={80} />
                  <p className="text-center font-medium">Linguistic engine idle. Provide input to begin analysis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function IdiomGallery() {
  return (
    <div className="md:col-span-2 bg-white p-10 rounded-[3.5rem] shadow-sm border border-zinc-100 overflow-hidden relative group">
      <div className="absolute inset-0 premium-gradient opacity-0 group-hover:opacity-[0.02] transition-opacity" />
      <div className="flex items-center justify-between mb-10">
        <div>
          <h4 className="text-xl font-bold flex items-center gap-3">
            <Quote className="w-5 h-5 text-zinc-400" />
            Linguistic Idioms
          </h4>
          <p className="text-xs text-zinc-400 font-medium">Expressions beyond the literal realm.</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-brand-red" />
          <div className="w-2 h-2 rounded-full bg-zinc-100" />
          <div className="w-2 h-2 rounded-full bg-zinc-100" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {GERMAN_IDIOMS.map((idiom, i) => (
          <motion.div 
            key={i} 
            whileHover={{ scale: 1.02 }}
            className="p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 hover:border-brand-red/30 transition-all cursor-crosshair group/item"
          >
            <div className="text-lg font-bold text-brand-black mb-1 group-hover/item:text-brand-red transition-colors">{idiom.de}</div>
            <div className="text-xs font-bold text-zinc-500 mb-4">{idiom.en}</div>
            <div className="text-[10px] font-mono text-zinc-300 uppercase tracking-tight line-clamp-1 italic">
              Lit: {idiom.literal}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function GrammarVisualizer() {
  const [sentence, setSentence] = useState('Ich kaufe heute einen Apfel.');
  const [structure, setStructure] = useState<any[]>([]);

  useEffect(() => {
    // Simple mock heuristic for German V2 rule visualization
    const words = sentence.split(' ');
    const mapping = words.map((w, i) => {
      let role = 'Other';
      const cleanWord = w.toLowerCase().replace(/[.,!]/g, '');
      
      if (i === 1) role = 'Verb (V2)';
      else if (i === 0) role = 'Subject';
      else if (['einen', 'den', 'das', 'die'].includes(cleanWord)) role = 'Article';
      else if (['apfel', 'haus', 'auto'].includes(cleanWord)) role = 'Object';
      else if (['heute', 'morgen', 'jetzt'].includes(cleanWord)) role = 'Time';
      
      return { word: w, role };
    });
    setStructure(mapping);
  }, [sentence]);

  return (
    <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-zinc-100 space-y-10">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div className="space-y-2">
          <h3 className="text-3xl font-bold tracking-tight">Syntax Architect</h3>
          <p className="text-zinc-400 font-medium">Decode German word order (SPO/V2) automatically.</p>
        </div>
        <div className="flex bg-zinc-50 p-1.5 rounded-2xl border border-zinc-100 min-w-[300px]">
          <input 
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 px-5 py-3 font-bold text-zinc-900"
            placeholder="Type a German sentence..."
          />
        </div>
      </div>

      <div className="flex gap-4 flex-wrap items-center justify-center py-10">
        {structure.map((item, i) => (
          <div key={i} className="group relative flex flex-col items-center">
            <motion.div 
              layoutId={`word-${i}`}
              className={`px-8 py-5 rounded-2xl font-bold text-2xl transition-all ${
                item.role === 'Verb (V2)' 
                  ? 'bg-brand-red text-white shadow-xl shadow-red-500/20' 
                  : item.role === 'Subject'
                  ? 'bg-brand-black text-white shadow-lg'
                  : 'bg-zinc-50 text-zinc-400 border border-zinc-100'
              }`}
            >
              {item.word}
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.role}
            </span>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center border-t border-zinc-50 pt-8 mt-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-brand-red" />
            <span className="text-xs font-bold text-zinc-400">Verb (Fixed Pos)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-brand-black" />
            <span className="text-xs font-bold text-zinc-400">Subject</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-200">
            <ArrowRight className="w-4 h-4" />
            <span className="text-xs font-bold italic">Dynamic Objects</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DictionaryPage({ proficiencyLevel, initialMode = 'search', savedWords = [], onSave, onRemove }: { proficiencyLevel: number, initialMode?: 'search' | 'flashcards', savedWords?: SavedWord[], onSave?: (de: string, en: string, cat?: string) => void, onRemove?: (de: string) => void }) {
  const STATIC_DICTIONARY = [
    // Gastronomy
    { de: 'Apfel', en: 'Apple', cat: 'Gastronomy' },
    { de: 'Brot', en: 'Bread', cat: 'Gastronomy' },
    { de: 'Essen', en: 'To eat / Food', cat: 'Gastronomy' },
    { de: 'Trinken', en: 'To drink', cat: 'Gastronomy' },
    { de: 'Wasser', en: 'Water', cat: 'Gastronomy' },
    { de: 'Küche', en: 'Kitchen', cat: 'Gastronomy' },
    { de: 'Kaffee', en: 'Coffee', cat: 'Gastronomy' },
    { de: 'Tee', en: 'Tea', cat: 'Gastronomy' },
    { de: 'Milch', en: 'Milk', cat: 'Gastronomy' },
    { de: 'Käse', en: 'Cheese', cat: 'Gastronomy' },
    { de: 'Wurst', en: 'Sausage', cat: 'Gastronomy' },
    { de: 'Ei', en: 'Egg', cat: 'Gastronomy' },
    { de: 'Salat', en: 'Salad', cat: 'Gastronomy' },
    { de: 'Suppe', en: 'Soup', cat: 'Gastronomy' },
    { de: 'Fleisch', en: 'Meat', cat: 'Gastronomy' },
    { de: 'Fisch', en: 'Fish', cat: 'Gastronomy' },
    { de: 'Gemüse', en: 'Vegetables', cat: 'Gastronomy' },
    { de: 'Obst', en: 'Fruit', cat: 'Gastronomy' },
    { de: 'Nachtisch', en: 'Dessert', cat: 'Gastronomy' },
    { de: 'Frühstück', en: 'Breakfast', cat: 'Gastronomy' },
    { de: 'Mittagessen', en: 'Lunch', cat: 'Gastronomy' },
    { de: 'Abendessen', en: 'Dinner', cat: 'Gastronomy' },
    { de: 'Speisekarte', en: 'Menu', cat: 'Gastronomy' },
    { de: 'Rechnung', en: 'Bill / Check', cat: 'Gastronomy' },
    { de: 'Trinkgeld', en: 'Tip', cat: 'Gastronomy' },

    // Professional
    { de: 'Arbeit', en: 'Work', cat: 'Professional' },
    { de: 'Lernen', en: 'To learn', cat: 'Professional' },
    { de: 'Beruf', en: 'Profession', cat: 'Professional' },
    { de: 'Chef', en: 'Boss', cat: 'Professional' },
    { de: 'Kollege', en: 'Colleague', cat: 'Professional' },
    { de: 'Büro', en: 'Office', cat: 'Professional' },
    { de: 'Termin', en: 'Appointment', cat: 'Professional' },
    { de: 'Sitzung', en: 'Meeting', cat: 'Professional' },
    { de: 'Vertrag', en: 'Contract', cat: 'Professional' },
    { de: 'Gehalt', en: 'Salary', cat: 'Professional' },
    { de: 'Bewerbung', en: 'Application', cat: 'Professional' },
    { de: 'Lebenslauf', en: 'Resume/CV', cat: 'Professional' },
    { de: 'Erfahrung', en: 'Experience', cat: 'Professional' },
    { de: 'Zusammenarbeit', en: 'Collaboration', cat: 'Professional' },
    { de: 'Verantwortung', en: 'Responsibility', cat: 'Professional' },
    { de: 'Fähigkeit', en: 'Skill', cat: 'Professional' },
    { de: 'Fortbildung', en: 'Further training', cat: 'Professional' },
    { de: 'Überstunden', en: 'Overtime', cat: 'Professional' },
    { de: 'Kündigung', en: 'Termination/Resignation', cat: 'Professional' },

    // Automotive
    { de: 'Auto', en: 'Car', cat: 'Automotive' },
    { de: 'Fahrrad', en: 'Bicycle', cat: 'Automotive' },
    { de: 'Motor', en: 'Engine', cat: 'Automotive' },
    { de: 'Reifen', en: 'Tire', cat: 'Automotive' },
    { de: 'Bremse', en: 'Brake', cat: 'Automotive' },
    { de: 'Lenkrad', en: 'Steering wheel', cat: 'Automotive' },
    { de: 'Autobahn', en: 'Highway', cat: 'Automotive' },
    { de: 'Parkplatz', en: 'Parking lot', cat: 'Automotive' },
    { de: 'Tankstelle', en: 'Gas station', cat: 'Automotive' },
    { de: 'Werkstatt', en: 'Workshop/Garage', cat: 'Automotive' },
    { de: 'LKW', en: 'Truck', cat: 'Automotive' },
    { de: 'Motorrad', en: 'Motorcycle', cat: 'Automotive' },
    { de: 'Verkehr', en: 'Traffic', cat: 'Automotive' },
    { de: 'Führerschein', en: 'Driver\'s license', cat: 'Automotive' },
    { de: 'Geschwindigkeit', en: 'Speed', cat: 'Automotive' },

    // Technology
    { de: 'Computer', en: 'Computer', cat: 'Technology' },
    { de: 'Software', en: 'Software', cat: 'Technology' },
    { de: 'Hardware', en: 'Hardware', cat: 'Technology' },
    { de: 'Internet', en: 'Internet', cat: 'Technology' },
    { de: 'Handy', en: 'Mobile phone', cat: 'Technology' },
    { de: 'Bildschirm', en: 'Screen', cat: 'Technology' },
    { de: 'Tastatur', en: 'Keyboard', cat: 'Technology' },
    { de: 'Maus', en: 'Mouse', cat: 'Technology' },
    { de: 'Drucker', en: 'Printer', cat: 'Technology' },
    { de: 'Kabel', en: 'Cable', cat: 'Technology' },
    { de: 'Speicher', en: 'Storage', cat: 'Technology' },
    { de: 'Netzwerk', en: 'Network', cat: 'Technology' },
    { de: 'Passwort', en: 'Password', cat: 'Technology' },
    { de: 'Webseite', en: 'Website', cat: 'Technology' },
    { de: 'Anwendung', en: 'Application', cat: 'Technology' },

    // Nature
    { de: 'Baum', en: 'Tree', cat: 'Nature' },
    { de: 'Berg', en: 'Mountain', cat: 'Nature' },
    { de: 'Wald', en: 'Forest', cat: 'Nature' },
    { de: 'Blume', en: 'Flower', cat: 'Nature' },
    { de: 'Fluss', en: 'River', cat: 'Nature' },
    { de: 'See', en: 'Lake', cat: 'Nature' },
    { de: 'Meer', en: 'Sea', cat: 'Nature' },
    { de: 'Himmel', en: 'Sky', cat: 'Nature' },
    { de: 'Sonne', en: 'Sun', cat: 'Nature' },
    { de: 'Mond', en: 'Moon', cat: 'Nature' },
    { de: 'Stern', en: 'Star', cat: 'Nature' },
    { de: 'Wetter', en: 'Weather', cat: 'Nature' },
    { de: 'Regen', en: 'Rain', cat: 'Nature' },
    { de: 'Schnee', en: 'Snow', cat: 'Nature' },
    { de: 'Wind', en: 'Wind', cat: 'Nature' },
    { de: 'Wolke', en: 'Cloud', cat: 'Nature' },
    { de: 'Tiere', en: 'Animals', cat: 'Nature' },

    // Architecture
    { de: 'Dach', en: 'Roof', cat: 'Architecture' },
    { de: 'Haus', en: 'House', cat: 'Architecture' },
    { de: 'Fenster', en: 'Window', cat: 'Architecture' },
    { de: 'Tür', en: 'Door', cat: 'Architecture' },
    { de: 'Wand', en: 'Wall', cat: 'Architecture' },
    { de: 'Boden', en: 'Floor', cat: 'Architecture' },
    { de: 'Treppe', en: 'Stairs', cat: 'Architecture' },
    { de: 'Aufzug', en: 'Elevator', cat: 'Architecture' },
    { de: 'Balkon', en: 'Balcony', cat: 'Architecture' },
    { de: 'Garten', en: 'Garden', cat: 'Architecture' },
    { de: 'Wohnung', en: 'Apartment', cat: 'Architecture' },
    { de: 'Zimmer', en: 'Room', cat: 'Architecture' },
    { de: 'Küche', en: 'Kitchen', cat: 'Architecture' },
    { de: 'Bad', en: 'Bathroom', cat: 'Architecture' },
    { de: 'Schlafzimmer', en: 'Bedroom', cat: 'Architecture' },
    { de: 'Schloss', en: 'Castle', cat: 'Architecture' },
    { de: 'Brücke', en: 'Bridge', cat: 'Architecture' },
    { de: 'Turm', en: 'Tower', cat: 'Architecture' },

    // General
    { de: 'Abend', en: 'Evening', cat: 'General' },
    { de: 'Danke', en: 'Thank you', cat: 'General' },
    { de: 'Hund', en: 'Dog', cat: 'General' },
    { de: 'Katze', en: 'Cat', cat: 'General' },
    { de: 'Kind', en: 'Child', cat: 'General' },
    { de: 'Machen', en: 'To do / make', cat: 'General' },
    { de: 'Morgen', en: 'Morning', cat: 'General' },
    { de: 'Nacht', en: 'Night', cat: 'General' },
    { de: 'Zeit', en: 'Time', cat: 'General' },
    { de: 'Freund', en: 'Friend', cat: 'General' },
    { de: 'Liebe', en: 'Love', cat: 'General' },
    { de: 'Glück', en: 'Happiness / Luck', cat: 'General' },
    { de: 'Helfen', en: 'To help', cat: 'General' },
    { de: 'Sprechen', en: 'To speak', cat: 'General' },
    { de: 'Verstehen', en: 'To understand', cat: 'General' },
    { de: 'Wichtig', en: 'Important', cat: 'General' },
    { de: 'Schnell', en: 'Fast', cat: 'General' },
    { de: 'Langsam', en: 'Slow', cat: 'General' },
    { de: 'Groß', en: 'Big', cat: 'General' },
    { de: 'Klein', en: 'Small', cat: 'General' },
    { de: 'Neu', en: 'New', cat: 'General' },
    { de: 'Alt', en: 'Old', cat: 'General' },
    { de: 'Gut', en: 'Good', cat: 'General' },
    { de: 'Schlecht', en: 'Bad', cat: 'General' },
    { de: 'Schön', en: 'Beautiful', cat: 'General' },
    { de: 'Einfach', en: 'Easy/Simple', cat: 'General' },
    { de: 'Schwer', en: 'Difficult/Heavy', cat: 'General' },
    { de: 'Vielleicht', en: 'Maybe', cat: 'General' },
    { de: 'Gestern', en: 'Yesterday', cat: 'General' },
    { de: 'Heute', en: 'Today', cat: 'General' },
    { de: 'Morgen', en: 'Tomorrow', cat: 'General' },
    { de: 'Woche', en: 'Week', cat: 'General' },
    { de: 'Monat', en: 'Month', cat: 'General' },
    { de: 'Jahr', en: 'Year', cat: 'General' },
    { de: 'Zukunft', en: 'Future', cat: 'General' },
    
    // Gastronomy
    { de: 'Salz', en: 'Salt', cat: 'Gastronomy' },
    { de: 'Pfeffer', en: 'Pepper', cat: 'Gastronomy' },
    { de: 'Zucker', en: 'Sugar', cat: 'Gastronomy' },
    { de: 'Honig', en: 'Honey', cat: 'Gastronomy' },
    { de: 'Marmelade', en: 'Jam', cat: 'Gastronomy' },
    { de: 'Butter', en: 'Butter', cat: 'Gastronomy' },

    // Professional
    { de: 'Erfolg', en: 'Success', cat: 'Professional' },
    { de: 'Ziel', en: 'Goal', cat: 'Professional' },
    { de: 'Planung', en: 'Planning', cat: 'Professional' },
    { de: 'Strategie', en: 'Strategy', cat: 'Professional' },
    { de: 'Kunde', en: 'Customer/Client', cat: 'Professional' },
    { de: 'Projekt', en: 'Project', cat: 'Professional' },
    
    // Automotive
    { de: 'Diesel', en: 'Diesel', cat: 'Automotive' },
    { de: 'Benzin', en: 'Gasoline', cat: 'Automotive' },
    { de: 'Motor', en: 'Engine', cat: 'Automotive' },
    { de: 'Reifen', en: 'Tire', cat: 'Automotive' },

    // Technical
    { de: 'Cloud', en: 'Cloud', cat: 'Technology' },
    { de: 'Daten', en: 'Data', cat: 'Technology' },
    { de: 'KI', en: 'AI', cat: 'Technology' },
    { de: 'Software', en: 'Software', cat: 'Technology' },

    // Nature
    { de: 'Ozean', en: 'Ocean', cat: 'Nature' },
    { de: 'Landschaft', en: 'Landscape', cat: 'Nature' },
    { de: 'Berg', en: 'Mountain', cat: 'Nature' },

    // Architecture
    { de: 'Fassade', en: 'Facade', cat: 'Architecture' },
    { de: 'Baustelle', en: 'Construction site', cat: 'Architecture' },
    { de: 'Gebäude', en: 'Building', cat: 'Architecture' },
  ];

  const [allWords, setAllWords] = useState<any[]>([]);
  
  useEffect(() => {
    const merged = [...STATIC_DICTIONARY];
    savedWords.forEach(sw => {
      if (!merged.some(m => m.de.toLowerCase() === sw.de.toLowerCase())) {
        merged.unshift({ de: sw.de, en: sw.en, cat: sw.cat || 'General' });
      }
    });
    setAllWords(merged);
  }, [savedWords]);

  const [activeCategory, setActiveCategory] = useState<string|null>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedWord, setSelectedWord] = useState<any>(null);
  const [example, setExample] = useState<{ de: string; en: string } | null>(null);
  const [isLoadingExample, setIsLoadingExample] = useState(false);
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'error' | 'success'>('idle');

  const handleAISearch = async () => {
    if (!query.trim()) return;
    setIsSearchingAI(true);
    setSearchStatus('searching');
    try {
      const result = await dictionaryLookup(query);
      if (result) {
        setSelectedWord(result);
        setExample(result.example || null);
        setShowSuggestions(false);
        setSearchStatus('success');
      } else {
        setSearchStatus('error');
      }
    } catch (e) {
      console.error(e);
      setSearchStatus('error');
    } finally {
      setIsSearchingAI(false);
    }
  };

  const displayedWords = useMemo(() => {
    return allWords.filter(w => {
      const matchesQuery = query.trim() === '' || 
        w.de.toLowerCase().includes(query.toLowerCase()) || 
        w.en.toLowerCase().includes(query.toLowerCase());
      const matchesCat = !activeCategory || w.cat === activeCategory;
      return matchesQuery && matchesCat;
    });
  }, [allWords, query, activeCategory]);

   useEffect(() => {
     if (initialMode === 'flashcards' && !selectedWord && allWords.length > 0) {
       startFlashcards();
     }
   }, [initialMode, allWords]);

  const fetchExample = async (word: string) => {
    setIsLoadingExample(true);
    setExample(null);
    try {
      const res = await getExampleSentence(word, proficiencyLevel);
      setExample(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingExample(false);
    }
  };

  const handleSelectWord = (item: any) => {
    setSelectedWord(item);
    setQuery(item.de);
    setShowSuggestions(false);
    fetchExample(item.de);
    setIsFlashcardMode(false);
    setIsFlipped(false);
  };

  const startFlashcards = () => {
    if (!selectedWord) {
      const source = allWords.length > 0 ? allWords : STATIC_DICTIONARY;
      const random = source[Math.floor(Math.random() * source.length)];
      setSelectedWord(random);
      fetchExample(random.de);
    }
    setIsFlashcardMode(true);
    setIsFlipped(false);
  };

  useEffect(() => {
    if (query.trim().length > 0 && showSuggestions) {
      const filtered = allWords.filter(item => 
        item.de.toLowerCase().includes(query.toLowerCase()) ||
        item.en.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [query, allWords, showSuggestions]);

  return (
    <motion.div key="dictionary" className="space-y-12 pb-20">
      <div className="relative h-[400px] rounded-[3rem] overflow-hidden group shadow-2xl">
        <img 
          src="https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=1600" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent"></div>
        <div className="absolute bottom-12 left-12 right-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-brand-red text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">Learning Center</span>
              <span className="bg-white/10 backdrop-blur-md text-brand-gold px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest leading-none border border-white/10">100,000+ Words</span>
            </div>
            <h2 className="text-6xl font-black text-white tracking-tighter leading-none">Global Word Bank</h2>
            <p className="text-zinc-300 font-medium max-w-sm">Search our core list or access millions of definitions via our external dictionary partner.</p>
          </div>
          
          <div className="relative max-w-xl w-full">
            <div className="flex items-center bg-white/10 backdrop-blur-2xl rounded-2xl p-2 border border-white/10 focus-within:ring-2 focus-within:ring-brand-gold/50 transition-all">
              <Search className="w-5 h-5 ml-4 text-white/50" />
              <input 
                type="text" 
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                  if (activeCategory) setActiveCategory(null);
                  if (selectedWord) setSelectedWord(null);
                }}
                onFocus={() => query.length > 0 && setShowSuggestions(true)}
                placeholder="Search words..." 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    window.open(`https://www.dict.cc/?s=${encodeURIComponent(query)}`, '_blank');
                  }
                }}
                className="bg-transparent border-none outline-none flex-1 px-4 py-4 text-white placeholder:text-white/30 text-lg font-bold"
              />
              {query && (
                <button onClick={() => { setQuery(''); setSelectedWord(null); setExample(null); setShowSuggestions(false); }} className="p-2 mr-2 text-white/40 hover:text-white transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {showSuggestions && (suggestions.length > 0 || query.trim().length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden z-[200]"
                >
                  <div className="p-2 max-h-[400px] overflow-y-auto">
                    {suggestions.map((item, i) => (
                      <button
                        key={item.de + i}
                        onClick={() => {
                          handleSelectWord(item);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors rounded-2xl group text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-brand-red">
                            <BookText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">{item.de}</div>
                            <div className="text-xs text-zinc-400 font-medium">{item.en}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{item.cat}</span>
                          <ChevronRight className="w-4 h-4 text-zinc-200 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    ))}
                    
                    {query.trim().length > 0 && (
                      <a
                        href={`https://www.dict.cc/?s=${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-2 p-4 bg-zinc-900 text-white rounded-2xl flex items-center justify-between group hover:bg-zinc-800 transition-all border-t border-white/10"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-brand-gold" />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-white">Massive Dictionary Search: "{query}"</div>
                            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                              Open dict.cc (Millions of German Terms)
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </a>
                    )}
                    {suggestions.length === 0 && query.trim().length > 0 && (
                      <div className="p-4 text-center">
                        <p className="text-sm text-zinc-400 italic">No local matches. Use the global search above.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <button 
            onClick={() => { setIsFlashcardMode(false); setSelectedWord(null); setQuery(''); setActiveCategory(null); }}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isFlashcardMode ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}
          >
            Dictionary List
          </button>
          <button 
            onClick={startFlashcards}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isFlashcardMode ? 'bg-brand-red text-white shadow-lg' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}
          >
            <Sparkles className="w-3 h-3" />
            Smart Flashcards
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isFlashcardMode && selectedWord ? (
          <motion.div 
            key="flashcards" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center py-12 gap-12"
          >
            <div className="flex gap-4">
               <button 
                 onClick={() => {
                   const random = allWords[Math.floor(Math.random() * allWords.length)];
                   handleSelectWord(random);
                   setIsFlashcardMode(true);
                   setIsFlipped(false);
                 }}
                 className="px-6 py-3 bg-zinc-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
               >
                 Shuffle Word
               </button>
            </div>

            <div 
              className="perspective-1000 w-full max-w-lg h-96 cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div 
                className="relative w-full h-full text-center transition-all duration-500 preserve-3d"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
              >
                <div className="absolute inset-0 backface-hidden bg-white border border-zinc-100 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-12">
                  <span className="text-xs font-black text-brand-red uppercase tracking-[0.3em] mb-4">German</span>
                  <h3 className="text-6xl font-black text-zinc-900 tracking-tighter lowercase">{selectedWord.de}</h3>
                  <div className="mt-8 flex items-center gap-2 text-zinc-300">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Click to Flip</span>
                  </div>
                </div>
                <div className="absolute inset-0 backface-hidden bg-zinc-900 border border-zinc-800 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-12 rotate-y-180">
                  <span className="text-xs font-black text-brand-gold uppercase tracking-[0.3em] mb-4">English</span>
                  <h3 className="text-6xl font-black text-white tracking-tighter lowercase">{selectedWord.en}</h3>
                  <p className="mt-6 text-zinc-400 text-sm font-medium italic">"{example?.de || '...'}"</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : selectedWord ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12"
          >
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-zinc-100 space-y-6">
                <button 
                  onClick={() => { setSelectedWord(null); setQuery(''); }}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 border border-zinc-100 rounded-2xl flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to List
                </button>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{selectedWord.cat}</span>
                  <h3 className="text-5xl font-bold text-zinc-900 tracking-tighter mt-2">{selectedWord.de}</h3>
                </div>
                <div className="flex items-center gap-4 p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <ArrowRightLeft className="w-5 h-5 text-brand-red" />
                  <span className="text-2xl font-bold text-zinc-600">{selectedWord.en}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-zinc-900 text-white rounded-[4rem] p-16 shadow-2xl min-h-[300px] flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
                  <MessageSquare size={240} />
                </div>
                
                <div className="relative z-10 space-y-8">
                  <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-4">
                    <Sparkles className="w-4 h-4 text-brand-gold" />
                    Context & Usage
                  </h4>
                  
                  {isLoadingExample ? (
                    <div className="space-y-4">
                      <div className="h-8 w-3/4 bg-white/10 rounded-xl animate-pulse"></div>
                      <div className="h-6 w-1/2 bg-white/10 rounded-xl animate-pulse"></div>
                    </div>
                  ) : example ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      <p className="text-4xl font-bold leading-tight tracking-tight text-white">{example.de}</p>
                      <p className="text-xl text-zinc-400 italic font-medium border-l-2 border-zinc-700 pl-8">{example.en}</p>
                    </motion.div>
                  ) : (
                    <p className="text-zinc-500 font-medium">Select a word to see AI-generated context.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-12">
            {!query && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {['General', 'Professional', 'Nature', 'Gastronomy', 'Automotive', 'Technology', 'Architecture'].filter(c => STATIC_DICTIONARY.some(w => w.cat === c)).map((cat) => (
                  <motion.div 
                    key={cat}
                    whileHover={{ y: -8 }}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`bg-white p-10 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.03)] border transition-all text-center space-y-4 cursor-pointer ${activeCategory === cat ? 'border-brand-red ring-4 ring-red-50' : 'border-zinc-100 hover:border-brand-red'}`}
                  >
                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors ${activeCategory === cat ? 'bg-brand-red text-white' : 'bg-zinc-50 text-zinc-200'}`}>
                      <Globe className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-zinc-900">{cat}</h4>
                    <p className="text-xs text-zinc-400 font-medium">
                      {STATIC_DICTIONARY.filter(w => w.cat === cat).length} definitions
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {displayedWords.map((word, i) => {
                  const isSaved = savedWords.some(sw => sw.de === word.de);
                  return (
                    <motion.div
                      key={word.de + i}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative"
                    >
                      <button
                        onClick={() => handleSelectWord(word)}
                        className="w-full p-6 bg-white rounded-3xl border border-zinc-100 text-left hover:border-brand-red transition-all shadow-sm pr-16"
                      >
                        <div className="flex items-center justify-between">
                           <span className="text-lg font-bold text-zinc-900">{word.de}</span>
                           <ArrowRight className="w-4 h-4 text-zinc-200 group-hover:text-brand-red transition-all" />
                        </div>
                        <span className="text-sm text-zinc-400 font-medium">{word.en}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSaved) {
                            onRemove?.(word.de);
                          } else {
                            onSave?.(word.de, word.en, word.cat);
                          }
                        }}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all ${isSaved ? 'text-brand-red bg-red-50 hover:bg-red-100 shadow-sm' : 'text-zinc-300 hover:text-brand-red hover:bg-zinc-50'}`}
                      >
                        <ShieldCheck className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {displayedWords.length === 0 && (
              <div className="text-center py-20 bg-zinc-50 rounded-[3rem] border border-dashed border-zinc-200">
                <Search className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-zinc-900">No words found</h3>
                <p className="text-zinc-400">Try searching for something else or clear filters.</p>
                <button 
                  onClick={() => { setQuery(''); setActiveCategory(null); }}
                  className="mt-6 px-8 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WordSearchSolver() {
  const [gridInput, setGridInput] = useState('');
  const [wordsInput, setWordsInput] = useState('');
  const [results, setResults] = useState<{ word: string; cells: [number, number][]; found: boolean }[]>([]);
  const [gridRows, setGridRows] = useState<string[][]>([]);

  const solve = () => {
    const rows = gridInput.trim().toUpperCase().split('\n').map(r => r.replace(/\s/g, '').split(''));
    if (rows.length === 0 || rows[0].length === 0) return;
    
    setGridRows(rows);
    const words = wordsInput.split(/[\s,]+/).filter(w => w.length > 1).map(w => w.toUpperCase());
    
    const foundWords: any[] = [];
    const R = rows.length;
    const C = rows[0].length;

    const directions = [
      [0, 1], [0, -1], [1, 0], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];

    words.forEach(word => {
      let isFound = false;
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          if (rows[r][c] === word[0]) {
            for (const [dr, dc] of directions) {
              const cells: [number, number][] = [];
              let match = true;
              for (let i = 0; i < word.length; i++) {
                const nr = r + i * dr;
                const nc = c + i * dc;
                if (nr < 0 || nr >= R || nc < 0 || nc >= C || rows[nr][nc] !== word[i]) {
                  match = false;
                  break;
                }
                cells.push([nr, nc]);
              }
              if (match) {
                foundWords.push({ word, cells, found: true });
                isFound = true;
                break;
              }
            }
          }
          if (isFound) break;
        }
        if (isFound) break;
      }
      if (!isFound) foundWords.push({ word, cells: [], found: false });
    });

    setResults(foundWords);
  };

  const isHighlighted = (r: number, c: number) => {
    return results.some(res => res.cells.some(([cr, cc]) => cr === r && cc === c));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-20"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-brand-red/10 p-2 rounded-lg"><Puzzle className="w-6 h-6 text-brand-red" /></div>
          <h2 className="text-4xl font-bold text-zinc-900 tracking-tighter">Word Search Solver</h2>
        </div>
        <p className="text-zinc-500 font-medium max-w-xl">Find hidden German words in any grid layout automatically.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-zinc-100 flex flex-col gap-6">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Puzzle Grid</label>
              <textarea
                value={gridInput}
                onChange={(e) => setGridInput(e.target.value)}
                placeholder="A B C D&#10;E F G H&#10;..."
                className="w-full h-40 bg-zinc-50 border-none rounded-2xl p-6 font-mono text-sm focus:ring-4 focus:ring-brand-gold/20 transition-all resize-none"
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1">Target Words</label>
              <input
                value={wordsInput}
                onChange={(e) => setWordsInput(e.target.value)}
                placeholder="HAUS, BAUM, ..."
                className="w-full bg-zinc-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-brand-gold/20 transition-all"
              />
            </div>
            <button
              onClick={solve}
              className="w-full bg-brand-red text-white py-4 rounded-xl font-bold tracking-wide shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
            >
              <Grid3X3 className="w-5 h-5" />
              Solve Puzzle
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-zinc-100">
            <h4 className="text-sm font-bold text-zinc-900 mb-6 px-1">Found Words</h4>
            <div className="space-y-3">
              {results.length === 0 ? (
                <div className="text-xs text-zinc-300 italic px-2 py-4">Solver ready...</div>
              ) : (
                results.map((res, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl ${res.found ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <span className="font-bold text-sm tracking-tight">{res.word}</span>
                    {res.found ? <CheckCircle2 className="w-4 h-4" /> : <div className="text-[10px] font-bold opacity-40 uppercase">Not found</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white p-12 rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] border border-zinc-100 flex items-center justify-center min-h-[500px]">
            {gridRows.length > 0 ? (
              <div 
                className="grid gap-2" 
                style={{ 
                  gridTemplateColumns: `repeat(${gridRows[0].length}, minmax(0, 1fr))`,
                  width: 'fit-content'
                }}
              >
                {gridRows.map((row, r) => row.map((char, c) => (
                  <motion.div
                    key={`${r}-${c}`}
                    animate={{ 
                      backgroundColor: isHighlighted(r, c) ? '#0066FF' : '#F9F9F9',
                      color: isHighlighted(r, c) ? '#FFFFFF' : '#333333',
                      scale: isHighlighted(r, c) ? 1.05 : 1
                    }}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm border border-white"
                  >
                    {char}
                  </motion.div>
                )))}
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto"><Grid3X3 className="w-10 h-10 text-zinc-200" /></div>
                <p className="text-zinc-300 font-medium">Input your puzzle grid on the left to visualize results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LevelSelector({ onSelect }: { onSelect: (level: number) => void }) {
  return (
    <div className="min-h-screen bg-brand-gray flex items-center justify-center p-6 text-brand-black">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-16 rounded-[4rem] shadow-2xl border border-zinc-100 max-w-4xl w-full text-center space-y-12"
      >
        <div className="space-y-4">
          <div className="w-20 h-20 bg-brand-red rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-red-500/20 mb-8">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h2 className="text-5xl font-black text-zinc-900 tracking-tighter">Identity & Mastery</h2>
          <p className="text-zinc-400 font-medium text-lg">Define your current linguistic threshold to calibrate the engine.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => (
            <button
              key={lvl}
              onClick={() => onSelect(lvl)}
              className="group relative flex flex-col items-center justify-center p-8 rounded-3xl border border-zinc-100 hover:border-brand-red hover:bg-brand-red transition-all"
            >
              <span className="text-4xl font-black text-zinc-900 group-hover:text-white transition-colors">{lvl}</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-300 group-hover:text-white/50 mt-2 transition-colors">
                {lvl === 1 ? 'Beginner' : 
                 lvl === 2 ? 'Novice' :
                 lvl === 3 ? 'Elementary' :
                 lvl === 4 ? 'Intermediate' :
                 lvl === 5 ? 'Upper-Intermediate' :
                 lvl === 6 ? 'Advanced' :
                 lvl === 7 ? 'Proficient' :
                 lvl === 8 ? 'Specialist' :
                 lvl === 9 ? 'Expert' :
                 'Fluent'}
              </span>
            </button>
          ))}
        </div>

        <div className="pt-8 flex flex-col items-center gap-4">
          <div className="flex -space-x-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-zinc-100 overflow-hidden">
                <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
          <p className="text-xs font-bold text-zinc-400">Join 40,000+ linguists optimizing their German studies.</p>
        </div>
      </motion.div>
    </div>
  );
}


