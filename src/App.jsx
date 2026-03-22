import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import * as pdfjsLib from 'pdfjs-dist';
import { 
  BookOpen, Calendar, CheckCircle2, Clock, LayoutDashboard, 
  Lightbulb, Moon, Settings, Sun, Target, TrendingUp, 
  Upload, Plus, Trash2, Calculator, ChevronLeft, ChevronRight, Quote, RefreshCw,
  Edit2, Flame, Snowflake, Save, X, ArrowUp, ArrowDown, User, MapPin, UserCircle, Briefcase, LogIn, LogOut, BarChart3, Camera, PieChart, Pause, ListTodo, CheckSquare, Cloud, AlertTriangle
} from 'lucide-react';

// ==========================================
// CRITICAL FIX: Remote PDF Worker
// This prevents Vercel from crashing the Quizzer Maker tab by bypassing local build limits.
// ==========================================
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBqzu18ymGSI2eHqa9R4EqXDMk3Batz-KM",
  authDomain: "xeia-learns.firebaseapp.com",
  projectId: "xeia-learns",
  storageBucket: "xeia-learns.firebasestorage.app",
  messagingSenderId: "392719858494",
  appId: "1:392719858494:web:013fcfdec48e465ddcca6f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// --- Helper Hook (Local Storage Persistence) ---
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) { return initialValue; }
  });
  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) { console.log(error); }
  };
  return [storedValue, setValue];
}

const colors = {
  creamsicle: '#ffefba', ibisPink: '#fbceb7', indigoChild: '#a4a2cc', parisPink: '#d86d9c', mauveMemento: '#a76e9c',
};

const paletteList = [colors.parisPink, colors.indigoChild, colors.ibisPink, colors.mauveMemento, colors.creamsicle];

const profileStatuses = [
    { text: 'Lock-in', icon: '🔒' },
    { text: 'Stu-dying', icon: '😫' },
    { text: 'Sleeping', icon: '😴' },
    { text: 'Chilling', icon: '🧊' },
    { text: 'Motivated', icon: '🔥' },
    { text: 'Dedicated', icon: '💪' },
    { text: 'Hopeful', icon: '🙏' },
];

// ==========================================
// ERROR BOUNDARY (Prevents White Screen of Death)
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 text-center flex flex-col items-center justify-center h-full">
          <AlertTriangle size={64} className="text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong in this tab.</h2>
          <p className="text-gray-500 mb-6 max-w-md">An unexpected error occurred while loading this view. Please try returning to the dashboard or refreshing the page.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#d86d9c] text-white rounded-xl font-bold hover:opacity-90">Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// MAIN APPLICATION SHELL
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useLocalStorage('xeia_darkmode', false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Core Data States
  const [profile, setProfile] = useLocalStorage('xeia_profile', { 
    name: 'Xeia', gender: '', age: '', yearLevel: 'Reviewee', 
    subtitle: "Let's crush those CPA goals today.", photo: '', 
    passerDate: '2026-05', currentStatus: profileStatuses[5] 
  });
  const [tasks, setTasks] = useLocalStorage('xeia_tasks', []);
  const [subjects, setSubjects] = useLocalStorage('xeia_subjects', []);
  const [schedule, setSchedule] = useLocalStorage('xeia_schedule', []);
  const [notes, setNotes] = useLocalStorage('xeia_notes', []);
  const [gradesData, setGradesData] = useLocalStorage('xeia_grades', {}); 
  const [calendarEvents, setCalendarEvents] = useLocalStorage('xeia_calendar', []);
  
  // Streak & Daily Reset Logic
  const [streak, setStreak] = useLocalStorage('xeia_streak', 0);
  const [totalDaysLogged, setTotalDaysLogged] = useLocalStorage('xeia_totalDays', 0);
  const [activityData, setActivityData] = useLocalStorage('xeia_activity', Array.from({ length: 42 }, () => 0));
  const [studyLogs, setStudyLogs] = useLocalStorage('xeia_studyLogs', []); 
  const [lastStudyDate, setLastStudyDate] = useLocalStorage('xeia_lastStudy', null);
  const [isFrozen, setIsFrozen] = useLocalStorage('xeia_isFrozen', true);

  // Global Timer States (Keeps running when switching tabs)
  const [timerInitialTime, setTimerInitialTime] = useLocalStorage('xeia_timerInit', 25 * 60);
  const [timerTimeLeft, setTimerTimeLeft] = useLocalStorage('xeia_timerLeft', 25 * 60);
  const [timerSessionElapsed, setTimerSessionElapsed] = useLocalStorage('xeia_timerElapsed', 0);
  const [timerIsRunning, setTimerIsRunning] = useState(false); 
  const [timerMode, setTimerMode] = useLocalStorage('xeia_timerMode', 'focus');
  const [timerSubjectId, setTimerSubjectId] = useLocalStorage('xeia_timerSubj', '');

  const [quotes, setQuotes] = useLocalStorage('xeia_quotes', [
    "Assets = Liabilities + Equity, and Hard Work = Success.",
    "Audit your habits, tax your distractions.",
  ]);
  const [currentQuote, setCurrentQuote] = useState(quotes[0]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) loadFromCloud(currentUser.uid);
    });
    return () => unsubscribe();
  }, []);

  // Dark Mode Applicator
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [darkMode]);

  // Daily Reset check
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (lastStudyDate !== todayStr && !isFrozen) {
      setIsFrozen(true);
    }
  }, [lastStudyDate, isFrozen, setIsFrozen]);

  const hasStudiedToday = lastStudyDate === new Date().toISOString().split('T')[0] && !isFrozen;

  // Cloud Database Handlers
  const saveToCloud = async () => {
    if (!user) return alert("Sign in with Google to sync!");
    try {
      await setDoc(doc(db, "users", user.uid), {
        profile, tasks, subjects, schedule, notes, streak, activityData, totalDaysLogged, 
        gradesData, calendarEvents, quotes, studyLogs, lastStudyDate, isFrozen
      });
      alert("Cloud Sync Successful!");
    } catch (e) { alert("Sync Error: " + e.message); }
  };

  const loadFromCloud = async (uid) => {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      setProfile(data.profile || profile);
      setTasks(data.tasks || []);
      setSubjects(data.subjects || []);
      setSchedule(data.schedule || []);
      setNotes(data.notes || []);
      setStreak(data.streak || 0);
      setActivityData(data.activityData || activityData);
      setTotalDaysLogged(data.totalDaysLogged || 0);
      setGradesData(data.gradesData || {});
      setCalendarEvents(data.calendarEvents || []);
      setQuotes(data.quotes || quotes);
      setStudyLogs(data.studyLogs || []);
      setLastStudyDate(data.lastStudyDate || null);
      setIsFrozen(data.isFrozen !== undefined ? data.isFrozen : true);
    }
  };

  // Helper Actions
  const changeQuote = () => setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  const addQuote = (newQuote) => { setQuotes([...quotes, newQuote]); setCurrentQuote(newQuote); };

  const logStudyTime = (minutes, subjectId) => {
    if (minutes <= 0) return;
    setActivityData(prev => {
      const next = [...prev];
      next[next.length - 1] += minutes;
      return next;
    });
    const today = new Date().toISOString().split('T')[0];
    setStudyLogs(prev => {
      const existingLogIndex = prev.findIndex(log => log.date === today && log.subjectId === subjectId);
      if (existingLogIndex >= 0) {
        const updated = [...prev];
        updated[existingLogIndex].minutes += minutes;
        return updated;
      }
      return [...prev, { date: today, subjectId, minutes }];
    });
  };

  const registerStudyDay = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (lastStudyDate !== todayStr || isFrozen) {
      setLastStudyDate(todayStr);
      setIsFrozen(false);
      setStreak(s => s + 1);
      setTotalDaysLogged(t => t + 1);
    }
  };

  // Global Timer Engine
  useEffect(() => {
    let interval = null;
    if (timerIsRunning && timerTimeLeft > 0) {
      interval = setInterval(() => {
        setTimerTimeLeft(t => t - 1);
        setTimerSessionElapsed(e => e + 1);
      }, 1000);
    } else if (timerTimeLeft === 0 && timerIsRunning) {
      setTimerIsRunning(false);
      if (timerMode === 'focus' && timerSubjectId) {
        logStudyTime(Math.max(1, Math.floor(timerSessionElapsed / 60)), timerSubjectId);
      }
      setTimerSessionElapsed(0);
      setTimerTimeLeft(timerInitialTime);
    }
    return () => clearInterval(interval);
  }, [timerIsRunning, timerTimeLeft, timerSessionElapsed, timerInitialTime, timerMode, timerSubjectId]);

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-[#fafafa] text-gray-800'}`}>
      <aside className={`w-64 border-r flex flex-col ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="p-6 flex items-center space-x-3">
          <svg viewBox="0 0 100 100" className="w-8 h-8 shrink-0" fill="#EBCB8B">
            <path d="M50 0 L55 35 L90 20 L65 50 L90 80 L55 65 L50 100 L45 65 L10 80 L35 50 L10 20 L45 35 Z" />
          </svg>
          <h1 className="text-xl font-bold" style={{ color: colors.mauveMemento }}>Xeia Learns</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} darkMode={darkMode} />
          <NavItem icon={<CheckCircle2 size={20} />} label="Tasks To-Do" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} darkMode={darkMode} />
          <NavItem icon={<Briefcase size={20} />} label="Class Schedule" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} darkMode={darkMode} />
          <NavItem icon={<BookOpen size={20} />} label="Quizzer Maker" active={activeTab === 'quizzer'} onClick={() => setActiveTab('quizzer')} darkMode={darkMode} />
          <NavItem icon={<Lightbulb size={20} />} label="Mind Board" active={activeTab === 'brainstorm'} onClick={() => setActiveTab('brainstorm')} darkMode={darkMode} />
          <NavItem icon={<Calculator size={20} />} label="Grades" active={activeTab === 'grades'} onClick={() => setActiveTab('grades')} darkMode={darkMode} />
          <NavItem icon={<Calendar size={20} />} label="Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} darkMode={darkMode} />
          <NavItem icon={<User size={20} />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} darkMode={darkMode} />
        </nav>
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} mt-auto`}>
           <button onClick={user ? () => signOut(auth) : () => signInWithPopup(auth, googleProvider)} className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            {user ? <LogOut size={20} /> : <LogIn size={20} />}
            <span className="text-sm font-bold truncate">{user ? user.displayName : 'Google Sign-in'}</span>
          </button>
          {user && (
            <button onClick={saveToCloud} className="mt-2 flex items-center justify-center space-x-2 w-full p-3 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-sm">
              <Save size={18} /> <span className="text-sm">Sync to Cloud</span>
            </button>
          )}
          <button onClick={() => setDarkMode(!darkMode)} className={`mt-2 flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            {darkMode ? <Sun size={20} className="text-[#ffefba]" /> : <Moon size={20} className="text-[#a4a2cc]" />}
            <span>Mode</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto relative">
        <ErrorBoundary>
          {activeTab === 'dashboard' && <DashboardView user={user} darkMode={darkMode} profile={profile} setProfile={setProfile} tasks={tasks} subjects={subjects} setSubjects={setSubjects} streak={streak} setStreak={setStreak} totalDaysLogged={totalDaysLogged} setTotalDaysLogged={setTotalDaysLogged} activityData={activityData} studyLogs={studyLogs} colors={colors} paletteList={paletteList} quote={currentQuote} changeQuote={changeQuote} addQuote={addQuote} logStudyTime={logStudyTime} registerStudyDay={registerStudyDay} isFrozen={isFrozen} setIsFrozen={setIsFrozen} hasStudiedToday={hasStudiedToday} timerProps={{timerInitialTime, setTimerInitialTime, timerTimeLeft, setTimerTimeLeft, timerSessionElapsed, setTimerSessionElapsed, timerIsRunning, setTimerIsRunning, timerMode, setTimerMode, timerSubjectId, setTimerSubjectId}} />}
          {activeTab === 'tasks' && <TasksView darkMode={darkMode} tasks={tasks} setTasks={setTasks} subjects={subjects} colors={colors} />}
          {activeTab === 'schedule' && <ScheduleView darkMode={darkMode} colors={colors} subjects={subjects} schedule={schedule} setSchedule={setSchedule} />}
          {activeTab === 'quizzer' && <QuizzerView darkMode={darkMode} colors={colors} />}
          {activeTab === 'brainstorm' && <BrainstormView darkMode={darkMode} colors={colors} notes={notes} setNotes={setNotes} />}
          {activeTab === 'grades' && <GradesView darkMode={darkMode} colors={colors} subjects={subjects} gradesData={gradesData} setGradesData={setGradesData} />}
          {activeTab === 'calendar' && <CalendarView darkMode={darkMode} colors={colors} tasks={tasks} subjects={subjects} calendarEvents={calendarEvents} setCalendarEvents={setCalendarEvents} />}
          {activeTab === 'profile' && <ProfileView darkMode={darkMode} colors={colors} profile={profile} setProfile={setProfile} statuses={profileStatuses} />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, darkMode }) {
  const activeClass = darkMode ? 'bg-gray-700 text-[#fbceb7]' : 'bg-[#ffefba]/30 text-[#a76e9c] font-medium';
  return (
    <button onClick={onClick} className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-all ${active ? activeClass : 'text-gray-500 hover:bg-gray-100'}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

// ==========================================
// VIEWS
// ==========================================

// --- Profile View ---
function ProfileView({ darkMode, colors, profile, setProfile, statuses }) {
  const [formData, setFormData] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFormData({ ...formData, photo: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusChange = (statusText) => {
    const selectedStatus = statuses.find(s => s.text === statusText);
    setFormData({ ...formData, currentStatus: selectedStatus });
  };

  const handleSave = () => {
    setProfile(formData);
    setIsEditing(false);
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm ${darkMode ? 'bg-gray-800 border-gray-600 focus:ring-[#a4a2cc] text-white' : 'bg-gray-50 border-gray-200 focus:ring-[#fbceb7]'}`;

  const formatPasserDate = (dateString) => {
    if (!dateString) return 'MAY 2026';
    const [year, month] = dateString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <h2 className="text-3xl font-bold mb-8 self-start">Identification Card</h2>
      
      <div className={`relative w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-[#4a4063] bg-white'}`}>
        <div className="bg-[#4a4063] text-white px-8 py-4 flex justify-between items-center">
           <h3 className="font-bold tracking-widest uppercase opacity-80 text-sm">IDENTIFICATION CARD</h3>
           {isEditing ? (
             <button onClick={handleSave} className="bg-white text-[#4a4063] px-4 py-1.5 rounded-full text-xs font-bold hover:scale-105 transition-transform">SAVE PROFILE</button>
           ) : (
             <button onClick={() => setIsEditing(true)} className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors">EDIT PROFILE</button>
           )}
        </div>

        <div className="p-8 flex flex-col md:flex-row gap-8 pb-12">
          <div className="shrink-0 flex flex-col items-center">
            <div className={`relative w-48 h-64 rounded-xl overflow-hidden border-2 flex items-center justify-center ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-100'}`}>
              {formData.photo ? (
                <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-gray-300" />
              )}
              
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer transition-opacity opacity-0 hover:opacity-100" onClick={() => fileInputRef.current?.click()}>
                   <Camera size={32} className="text-white" />
                   <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </div>
              )}
            </div>
            
            <div className="mt-6 text-center w-full">
               {isEditing ? (
                 <select value={formData.currentStatus?.text || ''} onChange={(e) => handleStatusChange(e.target.value)} className={`${inputClass} text-center`}>
                    <option value="">Set Status...</option>
                    {statuses.map(s => <option key={s.text} value={s.text}>{s.icon} {s.text}</option>)}
                 </select>
               ) : (
                 <div className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border shadow-sm ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <span className="text-lg">{formData.currentStatus?.icon || '💪'}</span>
                    <span className={`text-sm font-bold uppercase tracking-wider ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formData.currentStatus?.text || 'DEDICATED'}</span>
                 </div>
               )}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {isEditing ? (
               <input type="text" name="name" value={formData.name} onChange={handleChange} className={`text-5xl font-black mb-6 uppercase w-full bg-transparent border-b-2 outline-none ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} style={{ color: '#4a4063' }} />
            ) : (
               <h2 className="text-5xl font-black mb-8 uppercase tracking-tighter" style={{ color: '#4a4063' }}>{formData.name || 'YOUR NAME'}</h2>
            )}

            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">CPALE Passer by</p>
                {isEditing ? (
                    <input type="month" name="passerDate" value={formData.passerDate} onChange={handleChange} className={inputClass} />
                ) : (
                    <p className={`font-mono font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formatPasserDate(formData.passerDate)}</p>
                )}
              </div>
              
              <div>
                 <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Academic Level</p>
                 {isEditing ? (
                    <select name="yearLevel" value={formData.yearLevel} onChange={handleChange} className={inputClass}>
                      <option value="Freshman">Freshman</option>
                      <option value="Sophomore">Sophomore</option>
                      <option value="Junior">Junior</option>
                      <option value="Senior">Senior</option>
                      <option value="Reviewee">Reviewee</option>
                    </select>
                 ) : (
                    <p className={`font-bold uppercase ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formData.yearLevel}</p>
                 )}
              </div>

              <div>
                 <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Age</p>
                 {isEditing ? (
                    <input type="number" name="age" value={formData.age} onChange={handleChange} className={inputClass} />
                 ) : (
                    <p className={`font-bold uppercase ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formData.age || 'N/A'}</p>
                 )}
              </div>

              <div>
                 <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Gender</p>
                 {isEditing ? (
                    <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                      <option value="">Select Gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Other">Other</option>
                    </select>
                 ) : (
                    <p className={`font-bold uppercase ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formData.gender || 'N/A'}</p>
                 )}
              </div>
              
              <div className="col-span-2">
                 <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Current Goal</p>
                 {isEditing ? (
                    <input type="text" name="subtitle" value={formData.subtitle} onChange={handleChange} className={inputClass} />
                 ) : (
                    <p className={`font-bold italic ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>"{formData.subtitle}"</p>
                 )}
              </div>
            </div>

            <div className="mt-8 flex items-end justify-between">
              <div className="opacity-70 flex items-center h-12">
                 {Array.from({length: 30}).map((_, i) => (
                   <div key={i} className="h-full bg-black mx-[1px]" style={{ width: `${Math.max(1, Math.random() * 4)}px` }}></div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Dashboard View ---
function DashboardView({ user, darkMode, profile, setProfile, tasks, subjects, setSubjects, streak, setStreak, totalDaysLogged, setTotalDaysLogged, activityData, studyLogs, colors, paletteList, quote, changeQuote, addQuote, logStudyTime, registerStudyDay, isFrozen, setIsFrozen, hasStudiedToday, timerProps }) {
  const cardStyle = `p-6 rounded-3xl shadow-sm border transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
  
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [isAddingQuote, setIsAddingQuote] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [showStreakConfirm, setShowStreakConfirm] = useState(false);

  const subjectStats = subjects.map(sub => {
    const subTasks = tasks.filter(t => t.subjectId === sub.id);
    const completed = subTasks.filter(t => t.completed).length;
    return { ...sub, current: completed, total: subTasks.length };
  });

  const saveSubjectName = (id) => {
    if (editSubjectName.trim()) {
      setSubjects(subjects.map(s => s.id === id ? { ...s, name: editSubjectName } : s));
    }
    setEditingSubjectId(null);
  };

  const handleAddSubject = () => {
    const newSubject = { id: `s${Date.now()}`, name: 'New Subject', color: paletteList[subjects.length % paletteList.length] };
    setSubjects([...subjects, newSubject]);
    setEditingSubjectId(newSubject.id);
    setEditSubjectName('New Subject');
  };

  const handleDeleteSubject = (id) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const handleAddQuote = () => {
    if (newQuoteText.trim()) {
      addQuote(newQuoteText);
      setNewQuoteText('');
      setIsAddingQuote(false);
    }
  };

  let iconSize = 32;
  let iconClass = "text-[#fbceb7] transition-all duration-500";
  if (streak >= 3 && streak < 10) { iconSize = 48; iconClass = "text-[#d86d9c] animate-pulse drop-shadow-md"; } 
  else if (streak >= 10) { iconSize = 64; iconClass = "text-[#a76e9c] animate-bounce filter drop-shadow-[0_0_15px_rgba(216,109,156,0.8)]"; }

  if (isFrozen) {
     iconClass = "text-blue-300 animate-pulse filter drop-shadow-[0_0_10px_rgba(147,197,253,0.6)]";
     iconSize = 48;
  }

  const streakCardStyle = isFrozen 
    ? `col-span-1 md:col-span-3 p-6 rounded-3xl shadow-sm border transition-colors flex flex-col items-center justify-center text-center relative overflow-hidden ${darkMode ? 'bg-slate-800 border-blue-900 shadow-[inset_0_0_30px_rgba(30,58,138,0.2)]' : 'bg-[#f0f7ff] border-blue-100 shadow-[inset_0_0_30px_rgba(219,234,254,0.6)]'}`
    : `col-span-1 md:col-span-3 ${cardStyle} flex flex-col items-center justify-center text-center relative overflow-hidden`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Cloud Sync Reminder Banner */}
      {user && (
        <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border shadow-sm ${darkMode ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-800/50 text-blue-400' : 'bg-blue-200/50 text-blue-600'}`}>
              <Cloud size={20} />
            </div>
            <div>
              <p className={`font-bold text-sm ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Don't lose your progress!</p>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-blue-300/80' : 'text-blue-600/80'}`}>You are logged in via Google. Always click <strong>Sync to Cloud</strong> in the sidebar before leaving.</p>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-end mb-8">
        <div className="flex-1">
          <h2 className="text-3xl font-bold mb-1">Welcome back, {profile.name}!</h2>
          <input 
            type="text" 
            value={profile.subtitle || ''} 
            onChange={(e) => setProfile({...profile, subtitle: e.target.value})}
            placeholder="Set your daily goal here..."
            className={`w-full max-w-md bg-transparent border-b border-transparent focus:border-[#d86d9c] outline-none transition-colors ${darkMode ? 'text-gray-400 focus:text-white' : 'text-gray-500 focus:text-gray-900'}`}
          />
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm uppercase tracking-wider font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Today</p>
          <p className="text-xl font-medium" style={{ color: colors.parisPink }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className={`col-span-1 md:col-span-5 row-span-2 ${cardStyle} flex flex-col relative overflow-hidden p-0`}>
          <Timer darkMode={darkMode} logStudyTime={logStudyTime} colors={colors} subjects={subjects} studyLogs={studyLogs} timerProps={timerProps} />
        </div>

        <div className={`col-span-1 md:col-span-4 ${cardStyle} flex flex-col`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold tracking-wide uppercase text-sm flex items-center gap-2">
              <BookOpen size={16} style={{ color: colors.mauveMemento }}/> Subjects
            </h3>
            <button onClick={handleAddSubject} className={`hover:text-gray-600 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400'}`}><Plus size={18} /></button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 max-h-[220px]">
            {subjectStats.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center mt-6">No subjects added yet.</p>
            ) : (
              subjectStats.map(sub => (
                <div key={sub.id}>
                  <div className="flex justify-between text-sm mb-1 group">
                    {editingSubjectId === sub.id ? (
                      <div className="flex items-center gap-2 w-full">
                         <input type="text" autoFocus value={editSubjectName} onChange={(e) => setEditSubjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveSubjectName(sub.id)} onBlur={() => saveSubjectName(sub.id)} className={`flex-1 bg-transparent border-b focus:outline-none focus:border-[#d86d9c] ${darkMode ? 'border-gray-600 text-white' : 'border-gray-300'}`} />
                      </div>
                    ) : (
                      <>
                        <span className="font-medium flex items-center gap-2">
                          {sub.name}
                          <button onClick={() => { setEditingSubjectId(sub.id); setEditSubjectName(sub.name); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-500" title="Edit Name"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteSubject(sub.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500" title="Delete Subject"><Trash2 size={14} /></button>
                        </span>
                        <span className="text-gray-500">{sub.current}/{sub.total || 0}</span>
                      </>
                    )}
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: sub.total > 0 ? `${(sub.current / sub.total) * 100}%` : '0%', backgroundColor: sub.color }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={streakCardStyle}>
          {showStreakConfirm && (
            <div className="absolute inset-0 z-50 bg-gray-900/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
              <p className="text-white font-bold mb-6 text-base">Are you sure you want to reset your streak?</p>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={() => { setStreak(0); setTotalDaysLogged(0); setIsFrozen(true); setShowStreakConfirm(false); }} 
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                >
                  Yes, ready for academic reset
                </button>
                <button 
                  onClick={() => setShowStreakConfirm(false)} 
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                >
                  No
                </button>
              </div>
            </div>
          )}

          <button onClick={() => setShowStreakConfirm(true)} className="absolute top-4 left-4 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors z-10">Reset</button>
          
          <div className={`absolute top-4 right-4 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm border ${darkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-white text-gray-500 border-gray-200'}`}>Total Logged: {totalDaysLogged}</div>
          <div className="h-20 flex items-center justify-center mt-2 mb-2">
            {isFrozen ? <Snowflake size={iconSize} className={iconClass} /> : <Flame size={iconSize} className={iconClass} fill="currentColor" fillOpacity={0.2} />}
          </div>
          <h3 className="font-bold tracking-wide uppercase text-xs mb-1 transition-colors" style={{ color: isFrozen ? '#60a5fa' : '#6b7280' }}>{isFrozen ? 'Streak Frozen' : 'Current Streak'}</h3>
          <div className="text-5xl font-black my-1 transition-colors" style={{ color: isFrozen ? '#93c5fd' : colors.parisPink }}>{streak}</div>
          <p className="text-xs text-gray-500 mb-4 transition-colors">{isFrozen ? 'resume to unfreeze' : 'days of consecutive study'}</p>
          <button onClick={registerStudyDay} disabled={hasStudiedToday} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${hasStudiedToday ? (darkMode ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed') : 'text-white hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'}`} style={hasStudiedToday ? {} : { backgroundColor: isFrozen ? '#60a5fa' : colors.ibisPink }}>
            {hasStudiedToday ? 'Registered for Today!' : (isFrozen ? 'Unfreeze & Study' : 'Ready to Study')}
          </button>
        </div>

        <div className={`col-span-1 md:col-span-4 ${cardStyle} relative flex flex-col justify-center min-h-[160px]`}>
           {isAddingQuote ? (
             <div className="flex flex-col h-full animate-in fade-in zoom-in duration-200">
               <textarea autoFocus value={newQuoteText} onChange={(e) => setNewQuoteText(e.target.value)} placeholder="Type your favorite quote here..." className={`flex-1 w-full bg-transparent resize-none border-none focus:outline-none text-lg font-serif italic mb-2 ${darkMode ? 'placeholder-gray-600' : 'placeholder-gray-400'}`} />
               <div className="flex justify-end gap-2 mt-auto">
                 <button onClick={() => setIsAddingQuote(false)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>Cancel</button>
                 <button onClick={handleAddQuote} className="px-3 py-1.5 rounded-lg text-sm text-white font-medium transition-colors" style={{ backgroundColor: colors.mauveMemento }}>Save Quote</button>
               </div>
             </div>
           ) : (
             <>
               <button onClick={() => setIsAddingQuote(true)} className={`absolute top-4 right-4 transition-colors z-20 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}><Plus size={18} /></button>
               <div className="group cursor-pointer w-full h-full flex flex-col justify-center" onClick={changeQuote}>
                 <div className="absolute inset-0 bg-gradient-to-br from-[#ffefba]/10 to-[#fbceb7]/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <Quote size={24} className="mb-3 opacity-50 relative z-10" style={{ color: colors.mauveMemento }} />
                 <p className="font-serif italic text-lg leading-relaxed relative z-10">"{quote}"</p>
                 <p className="text-xs text-gray-400 mt-4 uppercase tracking-widest text-right relative z-10">Click to refresh</p>
               </div>
             </>
           )}
        </div>

        <div className={`col-span-1 md:col-span-3 ${cardStyle}`}>
          <h3 className="font-bold tracking-wide uppercase text-sm mb-4 flex items-center gap-2"><TrendingUp size={16} style={{ color: colors.indigoChild }}/> Activity</h3>
          <ActivityHeatmap colors={colors} darkMode={darkMode} activityData={activityData} />
        </div>
      </div>
    </div>
  );
}

function Timer({ darkMode, logStudyTime, colors, subjects, studyLogs, timerProps }) {
  const {
    timerInitialTime, setTimerInitialTime,
    timerTimeLeft, setTimerTimeLeft,
    timerSessionElapsed, setTimerSessionElapsed,
    timerIsRunning, setTimerIsRunning,
    timerMode, setTimerMode,
    timerSubjectId, setTimerSubjectId
  } = timerProps;

  const [isEditing, setIsEditing] = useState(false);
  const [showStats, setShowStats] = useState(false); 
  const [editHours, setEditHours] = useState(0);
  const [editMins, setEditMins] = useState(25);

  const getLoggedMinutes = () => Math.max(1, Math.floor(timerSessionElapsed / 60));

  const toggleTimer = () => {
    if (!timerSubjectId && timerMode === 'focus') return alert("Please select a subject to study first!");
    setTimerIsRunning(!timerIsRunning);
  };
  
  const handleLogAndReset = () => {
    setTimerIsRunning(false);
    const minsToLog = getLoggedMinutes();
    if (minsToLog > 0 && timerMode === 'focus' && timerSubjectId) logStudyTime(minsToLog, timerSubjectId); 
    setTimerSessionElapsed(0);
    setTimerTimeLeft(timerInitialTime);
  };

  const changeMode = (newMode) => {
    setTimerMode(newMode);
    setTimerIsRunning(false);
    setTimerSessionElapsed(0);
    const preset = newMode === 'focus' ? 25 * 60 : 5 * 60;
    setTimerInitialTime(preset);
    setTimerTimeLeft(preset);
  };

  const openSettings = () => {
    setTimerIsRunning(false);
    setEditHours(Math.floor(timerInitialTime / 3600));
    setEditMins(Math.floor((timerInitialTime % 3600) / 60));
    setIsEditing(true);
  };

  const saveSettings = () => {
    const newSeconds = (editHours * 3600) + (editMins * 60);
    const finalSeconds = newSeconds === 0 ? 60 : newSeconds; 
    setTimerInitialTime(finalSeconds);
    setTimerTimeLeft(finalSeconds);
    setTimerSessionElapsed(0);
    setIsEditing(false);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const todayDateStr = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const dailyStats = subjects.map(sub => {
    const mins = studyLogs.filter(log => log.date === todayDateStr && log.subjectId === sub.id).reduce((acc, curr) => acc + curr.minutes, 0);
    return { ...sub, minutes: mins };
  });

  const weeklyStats = subjects.map(sub => {
    const mins = studyLogs.filter(log => new Date(log.date) >= sevenDaysAgo && log.subjectId === sub.id).reduce((acc, curr) => acc + curr.minutes, 0);
    return { ...sub, minutes: mins };
  });

  const formatMinsToHrs = (mins) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <>
      <style>{`@keyframes fluidBackground { 0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: translate(0px, 0px) scale(1); } 25% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; transform: translate(-150px, 150px) scale(1.1); } 50% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; transform: translate(-300px, 50px) scale(0.9); } 75% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(-150px, -50px) scale(1.05); } 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: translate(0px, 0px) scale(1); } }`}</style>
      <div className="absolute -top-20 -right-20 w-80 h-80 opacity-30 blur-3xl pointer-events-none" style={{ backgroundColor: colors.parisPink, animation: 'fluidBackground 15s ease-in-out infinite', animationPlayState: timerIsRunning ? 'running' : 'paused' }}></div>
      <div className="flex flex-col flex-1 relative z-10 p-6 h-full">
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h3 className="font-bold tracking-wide uppercase text-sm text-gray-500">Focus Session</h3>
            {timerMode === 'focus' && !showStats && (
              <select value={timerSubjectId} onChange={e => setTimerSubjectId(e.target.value)} className={`text-xs font-bold px-2 py-1 rounded-md border outline-none ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
                <option value="">Select Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setShowStats(!showStats)} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`} title="Study Statistics">
               <BarChart3 size={18} />
             </button>
             {!showStats && <Settings size={18} className={`cursor-pointer transition-colors ${isEditing ? (darkMode ? 'text-gray-200' : 'text-gray-800') : (darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`} onClick={isEditing ? saveSettings : openSettings} />}
          </div>
        </div>

        {showStats ? (
          <div className="flex flex-col flex-1 overflow-y-auto pr-2 animate-in fade-in">
            <h4 className={`text-sm font-bold uppercase tracking-widest mb-4 border-b pb-2 ${darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>Study Statistics</h4>
            
            <div className="mb-6">
              <h5 className="text-xs font-bold text-gray-500 mb-3">TODAY (Resets Daily)</h5>
              {dailyStats.filter(s => s.minutes > 0).length === 0 ? <p className="text-xs text-gray-400 italic">No study time logged today.</p> : dailyStats.filter(s => s.minutes > 0).map(sub => (
                 <div key={sub.id} className="flex justify-between items-center mb-2">
                   <span className="text-sm font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: sub.color}}></div>{sub.name}</span>
                   <span className="font-bold text-sm">{formatMinsToHrs(sub.minutes)}</span>
                 </div>
              ))}
            </div>

            <div>
              <h5 className="text-xs font-bold text-gray-500 mb-3">THIS WEEK (Last 7 Days)</h5>
              {weeklyStats.filter(s => s.minutes > 0).length === 0 ? <p className="text-xs text-gray-400 italic">No study time logged this week.</p> : weeklyStats.filter(s => s.minutes > 0).map(sub => (
                 <div key={sub.id} className="flex justify-between items-center mb-2">
                   <span className="text-sm font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: sub.color}}></div>{sub.name}</span>
                   <span className="font-bold text-sm">{formatMinsToHrs(sub.minutes)}</span>
                 </div>
              ))}
            </div>
          </div>
        ) : isEditing ? (
          <div className="flex flex-col items-center justify-center flex-1">
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wide text-gray-500">Set Custom Timer</h4>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex flex-col items-center">
                <input type="number" value={editHours} onChange={e => setEditHours(Math.max(0, Math.min(23, Number(e.target.value))))} className={`w-16 h-12 text-center text-xl font-bold rounded-lg border focus:ring-2 outline-none transition-all ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-800'}`} style={{ borderBottomColor: colors.indigoChild }}/>
                <span className="text-xs text-gray-400 mt-2 uppercase font-semibold">HRS</span>
              </div>
              <span className="text-3xl font-bold text-gray-300 pb-5">:</span>
              <div className="flex flex-col items-center">
                <input type="number" value={editMins} onChange={e => setEditMins(Math.max(0, Math.min(59, Number(e.target.value))))} className={`w-16 h-12 text-center text-xl font-bold rounded-lg border focus:ring-2 outline-none transition-all ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-800'}`} style={{ borderBottomColor: colors.indigoChild }}/>
                <span className="text-xs text-gray-400 mt-2 uppercase font-semibold">MIN</span>
              </div>
            </div>
            <button onClick={saveSettings} className="px-6 py-2 rounded-xl text-white font-bold transition-transform hover:scale-105 active:scale-95 shadow-md" style={{ backgroundColor: colors.mauveMemento }}>Save Timer</button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1">
            <div className={`flex space-x-2 mb-6 p-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${timerMode === 'focus' ? (darkMode ? 'bg-gray-600 shadow-sm text-white' : 'bg-white shadow-sm text-gray-900') : 'text-gray-500'}`} onClick={() => changeMode('focus')}>Focus</button>
              <button className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${timerMode === 'break' ? (darkMode ? 'bg-gray-600 shadow-sm text-white' : 'bg-white shadow-sm text-gray-900') : 'text-gray-500'}`} onClick={() => changeMode('break')}>Break</button>
            </div>
            
            <div className="flex flex-col items-center mb-8">
               <div className="text-7xl font-bold tracking-tighter font-mono cursor-pointer hover:opacity-80 transition-opacity" style={{ color: timerMode === 'focus' ? colors.parisPink : colors.indigoChild }} onClick={openSettings}>
                 {formatTime(timerTimeLeft)}
               </div>
               <span className="text-[10px] uppercase tracking-widest text-gray-400 mt-2">Click the timer to customize time</span>
            </div>

            <div className="flex space-x-4 relative">
              <button onClick={toggleTimer} className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95" style={{ backgroundColor: timerIsRunning ? colors.mauveMemento : colors.parisPink }}>
                {timerIsRunning ? <Pause size={28} fill="currentColor" /> : <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-2"></div>}
              </button>
              <button onClick={handleLogAndReset} title={timerSessionElapsed > 0 ? "Log Time & Stop" : "Reset Timer"} className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${timerSessionElapsed > 0 ? (darkMode ? 'border-green-600 bg-green-900/30 text-green-400 hover:bg-green-800' : 'border-green-400 bg-green-50 text-green-600 hover:bg-green-100') : (darkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}`}>
                {timerSessionElapsed > 0 ? <CheckCircle2 size={24} /> : <RefreshCw size={24} />}
              </button>
              {timerSessionElapsed > 0 && timerMode === 'focus' && (
                <div className={`absolute -bottom-6 left-0 right-0 text-center text-xs font-bold whitespace-nowrap ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                   Log {getLoggedMinutes()} min{getLoggedMinutes() !== 1 && 's'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ActivityHeatmap({ colors, darkMode, activityData }) {
  const getLevel = (minutes) => {
    if (minutes === 0) return 0;
    if (minutes <= 30) return 1;
    if (minutes <= 90) return 2;
    return 3;
  };
  const getColor = (level) => {
    if (level === 0) return darkMode ? '#374151' : '#f3f4f6';
    if (level === 1) return `${colors.ibisPink}66`; 
    if (level === 2) return `${colors.parisPink}99`; 
    return colors.parisPink; 
  };
  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {activityData.map((minutes, i) => (
          <div key={i} className="aspect-square rounded-sm sm:rounded-md transition-colors duration-300 relative group" style={{ backgroundColor: getColor(getLevel(minutes)) }}>
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none -translate-x-1/2 left-1/2 shadow-lg">
               {minutes > 0 ? `${minutes} mins studied` : 'No study logged'}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end mt-3 text-xs text-gray-400 space-x-1">
        <span>Less</span><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(0) }}></div><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(1) }}></div><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(2) }}></div><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(3) }}></div><span>More</span>
      </div>
    </div>
  );
}

// --- Schedule View ---
function ScheduleView({ darkMode, colors, subjects, schedule, setSchedule }) {
  const [editingId, setEditingId] = useState(null);
  const [newSubj, setNewSubj] = useState(subjects[0]?.id || '');
  const [newDays, setNewDays] = useState(['Monday']);
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('09:30');
  const [newRoom, setNewRoom] = useState('');
  const [newInst, setNewInst] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (d) => {
    setNewDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleAddOrUpdate = (e) => {
    e.preventDefault();
    if (!newRoom.trim() || !newInst.trim() || newDays.length === 0) return alert("Please fill all fields and select at least one day.");
    
    if (editingId) {
      setSchedule(schedule.map(s => s.id === editingId ? { ...s, subjectId: newSubj, days: newDays, startTime: newStart, endTime: newEnd, room: newRoom, instructor: newInst } : s));
      setEditingId(null);
    } else {
      setSchedule([...schedule, { id: Date.now(), subjectId: newSubj, days: newDays, startTime: newStart, endTime: newEnd, room: newRoom, instructor: newInst }]);
    }
    
    setNewRoom(''); 
    setNewInst('');
  };

  const startEdit = (cls) => {
    setEditingId(cls.id);
    setNewSubj(cls.subjectId);
    setNewDays(cls.days || (cls.day ? [cls.day] : ['Monday'])); 
    setNewStart(cls.startTime);
    setNewEnd(cls.endTime);
    setNewRoom(cls.room);
    setNewInst(cls.instructor);
  };

  const inputClass = `w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`;

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Class Schedule</h2>
      <div className="flex flex-col lg:flex-row gap-8">
        
        <div className={`w-full lg:w-80 p-6 rounded-3xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Update Class' : 'Log a Class'}</h3>
          <form onSubmit={handleAddOrUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
              <select value={newSubj} onChange={e => setNewSubj(e.target.value)} className={inputClass} required>
                <option value="">Select a Subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Days of the Week</label>
              <div className="flex flex-wrap gap-2">
                 {daysOfWeek.map(d => (
                   <button 
                     key={d} 
                     type="button"
                     onClick={() => toggleDay(d)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${newDays.includes(d) ? 'text-white' : (darkMode ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50')}`}
                     style={newDays.includes(d) ? { backgroundColor: colors.mauveMemento, borderColor: colors.mauveMemento } : {}}
                   >
                     {d.slice(0, 3)}
                   </button>
                 ))}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start</label>
                <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className={inputClass} required />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label>
                <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className={inputClass} required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Room</label>
              <input type="text" value={newRoom} onChange={e => setNewRoom(e.target.value)} placeholder="e.g. Room 304" className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Instructor</label>
              <input type="text" value={newInst} onChange={e => setNewInst(e.target.value)} placeholder="e.g. Dr. Smith" className={inputClass} required />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl text-white font-bold transition-transform hover:scale-105 active:scale-95 shadow-md" style={{ backgroundColor: colors.mauveMemento }}>
              {editingId ? 'Save Changes' : 'Add to Schedule'}
            </button>
            {editingId && (
              <button type="button" onClick={() => setEditingId(null)} className={`w-full py-2 text-sm font-bold mt-2 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        <div className={`flex-1 p-8 rounded-3xl border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <h3 className="text-lg font-bold mb-6">Weekly Agenda</h3>
          {schedule.length === 0 ? (
             <p className="text-gray-400 italic text-center py-10">No classes scheduled yet. Add your first class!</p>
          ) : (
            <div className="space-y-6">
              {daysOfWeek.map(day => {
                const classes = schedule.filter(s => (s.days && s.days.includes(day)) || s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
                if (classes.length === 0) return null;
                
                return (
                  <div key={day}>
                    <h4 className={`text-sm font-bold uppercase mb-3 border-b pb-2 ${darkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>{day}</h4>
                    <div className="space-y-3">
                      {classes.map(cls => {
                        const subj = subjects.find(s => s.id === cls.subjectId) || { name: 'Unknown', color: '#ccc' };
                        return (
                          <div key={cls.id} className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-xl text-white flex flex-col items-center justify-center font-bold shadow-sm shrink-0" style={{ backgroundColor: subj.color }}>
                                <span className="text-lg">{cls.startTime.split(':')[0]}</span>
                                <span className="text-[10px] opacity-80 leading-none">{cls.startTime.split(':')[1]}</span>
                              </div>
                              <div>
                                <h5 className="font-bold text-lg" style={{ color: subj.color }}>{subj.name}</h5>
                                <div className={`flex flex-wrap gap-3 text-xs font-medium mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  <span className="flex items-center gap-1"><Clock size={12}/> {cls.startTime} - {cls.endTime}</span>
                                  <span className="flex items-center gap-1"><MapPin size={12}/> {cls.room}</span>
                                  <span className="flex items-center gap-1"><UserCircle size={12}/> {cls.instructor}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 self-end md:self-auto">
                              <button onClick={() => startEdit(cls)} className={`p-2 rounded-lg border shadow-sm transition-colors ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-300 hover:text-blue-400' : 'bg-white border-gray-200 text-gray-500 hover:text-blue-500'}`} title="Edit Class">
                                <Edit2 size={16}/>
                              </button>
                              <button onClick={() => setSchedule(schedule.filter(s => s.id !== cls.id))} className={`p-2 rounded-lg border shadow-sm transition-colors ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-300 hover:text-red-400' : 'bg-white border-gray-200 text-gray-500 hover:text-red-500'}`} title="Delete Class">
                                <Trash2 size={16}/>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Tasks To-Do View ---
function TasksView({ darkMode, tasks, setTasks, subjects, colors }) {
  const [tab, setTab] = useState('todo'); 
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newSubjectId, setNewSubjectId] = useState(subjects[0]?.id || '');
  const [newDeadline, setNewDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks([...tasks, { id: Date.now(), title: newTaskTitle, subjectId: newSubjectId || subjects[0]?.id, deadline: newDeadline, completed: false }]);
    setNewTaskTitle('');
  };

  const toggleTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));
  const saveTaskEdit = (id, newVals) => { setTasks(tasks.map(t => t.id === id ? { ...t, ...newVals } : t)); setEditingTaskId(null); };

  const todoTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const groupTasks = (taskList) => {
    const groups = { Overdue: [], Today: [], Tomorrow: [], Upcoming: [] };
    taskList.forEach(t => {
      if (!t.deadline) groups.Upcoming.push(t);
      else if (t.deadline < todayStr) groups.Overdue.push(t);
      else if (t.deadline === todayStr) groups.Today.push(t);
      else if (t.deadline === tomorrowStr) groups.Tomorrow.push(t);
      else groups.Upcoming.push(t);
    });
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    });
    return groups;
  };

  const groupedTodos = groupTasks(todoTasks);

  const renderTask = (task) => {
    const subject = subjects.find(s => s.id === task.subjectId) || { name: 'Unknown', color: '#ccc' };
    const isEditing = editingTaskId === task.id;

    if (isEditing) {
      return <EditTaskForm key={task.id} task={task} subjects={subjects} onSave={saveTaskEdit} onCancel={() => setEditingTaskId(null)} darkMode={darkMode} colors={colors} />;
    }

    return (
      <div key={task.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm group ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => toggleTask(task.id)} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${task.completed ? 'bg-green-500 border-green-500 text-white' : (darkMode ? 'border-gray-500 text-transparent hover:border-[#d86d9c]' : 'border-gray-300 text-transparent hover:border-[#d86d9c]')}`}><CheckCircle2 size={16} /></button>
          <div className={task.completed ? 'opacity-50 line-through' : ''}>
            <p className="font-medium text-lg flex items-center gap-2">{task.title}{!task.completed && <button onClick={() => setEditingTaskId(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#d86d9c]"><Edit2 size={14} /></button>}</p>
            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold text-white shadow-sm" style={{ backgroundColor: subject.color }}>{subject.name}</span>
              {task.deadline && <span className="flex items-center gap-1"><Calendar size={12}/> {task.deadline}</span>}
            </p>
          </div>
        </div>
        <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={20} /></button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold">Tasks</h2>
        <div className={`flex space-x-1 p-1 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
           <button onClick={() => setTab('todo')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${tab === 'todo' ? (darkMode ? 'bg-gray-600 shadow-sm text-white' : 'bg-white shadow-sm text-gray-900') : 'text-gray-500'}`}><ListTodo size={16} /> To-Do</button>
           <button onClick={() => setTab('done')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${tab === 'done' ? (darkMode ? 'bg-gray-600 shadow-sm text-white' : 'bg-white shadow-sm text-gray-900') : 'text-gray-500'}`}><CheckSquare size={16} /> Completed</button>
        </div>
      </div>

      {tab === 'todo' && (
        <div className={`p-6 rounded-2xl mb-8 shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <form onSubmit={addTask} className="flex flex-col md:flex-row gap-4">
            <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="What needs to be done?" className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${darkMode ? 'bg-gray-700 border-gray-600 focus:ring-[#a4a2cc] text-white' : 'bg-gray-50 border-gray-200 focus:ring-[#fbceb7]'}`} />
            <div className="flex gap-4">
              <select value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)} className={`px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${darkMode ? 'bg-gray-700 border-gray-600 focus:ring-[#a4a2cc] text-white' : 'bg-gray-50 border-gray-200 focus:ring-[#fbceb7]'}`} required>
                <option value="">Select Subject...</option>
                {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </select>
              <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className={`px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 ${darkMode ? 'bg-gray-700 border-gray-600 focus:ring-[#a4a2cc] text-white' : 'bg-gray-50 border-gray-200 focus:ring-[#fbceb7]'}`} />
              <button type="submit" className="px-6 py-3 rounded-xl text-white font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-2" style={{ backgroundColor: colors.mauveMemento }}><Plus size={20} /> <span className="hidden md:inline">Add</span></button>
            </div>
          </form>
        </div>
      )}

      {tab === 'todo' ? (
        <div className="space-y-8">
          {todoTasks.length === 0 && <p className="text-center text-gray-400 py-10 font-medium">All caught up! Enjoy your break!</p>}
          
          {groupedTodos.Overdue.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3 ml-2">Overdue</h3>
              <div className="space-y-3">{groupedTodos.Overdue.map(renderTask)}</div>
            </div>
          )}
          {groupedTodos.Today.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 ml-2">Today</h3>
              <div className="space-y-3">{groupedTodos.Today.map(renderTask)}</div>
            </div>
          )}
          {groupedTodos.Tomorrow.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-3 ml-2">Tomorrow</h3>
              <div className="space-y-3">{groupedTodos.Tomorrow.map(renderTask)}</div>
            </div>
          )}
          {groupedTodos.Upcoming.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 ml-2">Upcoming / No Date</h3>
              <div className="space-y-3">{groupedTodos.Upcoming.map(renderTask)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {doneTasks.length === 0 ? (
             <p className="text-center text-gray-400 py-10 font-medium">No completed tasks yet. Time to get to work!</p>
          ) : (
             doneTasks.sort((a,b) => new Date(b.id) - new Date(a.id)).map(renderTask)
          )}
        </div>
      )}
    </div>
  );
}

function EditTaskForm({ task, subjects, onSave, onCancel, darkMode, colors }) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editSubjectId, setEditSubjectId] = useState(task.subjectId);
  const [editDeadline, setEditDeadline] = useState(task.deadline);
  const handleSave = () => onSave(task.id, { title: editTitle, subjectId: editSubjectId, deadline: editDeadline });

  return (
    <div className={`flex flex-col md:flex-row items-center gap-3 p-4 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
       <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className={`flex-1 px-3 py-2 rounded-lg border w-full ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
       <select value={editSubjectId} onChange={e => setEditSubjectId(e.target.value)} className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
         {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
       </select>
       <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
       <div className="flex gap-2">
         <button onClick={handleSave} className="p-2 rounded-lg text-white" style={{ backgroundColor: colors.mauveMemento }}><Save size={18} /></button>
         <button onClick={onCancel} className={`p-2 rounded-lg ${darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-300 text-gray-700'}`}><X size={18} /></button>
       </div>
    </div>
  );
}

// --- Calendar View ---
function CalendarView({ darkMode, colors, tasks, subjects, calendarEvents, setCalendarEvents }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 1)); 
  const [selectedDay, setSelectedDay] = useState(21);
  
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dates = Array.from({length: daysInMonth}, (_, i) => i + 1);
  const padding = Array.from({length: startDayOfWeek}, (_, i) => '');

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const getSelectedDateStr = () => `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDateStr = getSelectedDateStr();

  useEffect(() => {
    setNewEventDate(selectedDateStr);
  }, [selectedDateStr]);

  const todaysTasks = tasks.filter(t => t.deadline === selectedDateStr);
  const todaysEvents = calendarEvents.filter(e => e.date === selectedDateStr);

  const addEvent = (e) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate) return;
    setCalendarEvents([...calendarEvents, { id: Date.now(), title: newEventTitle, date: newEventDate }]);
    setNewEventTitle('');
  };

  const removeEvent = (id) => {
    setCalendarEvents(calendarEvents.filter(ev => ev.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
      <div className={`flex-1 p-8 rounded-3xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
             <Calendar className="text-gray-400"/> {monthName}
          </h2>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><ChevronLeft size={20}/></button>
            <button onClick={handleNextMonth} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><ChevronRight size={20}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-4 text-center">
          {days.map((d, i) => <div key={`day-${i}`} className="font-bold text-gray-400 text-sm">{d}</div>)}
          {padding.map((_, i) => <div key={`pad-${i}`}></div>)}
          
          {dates.map(d => {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const hasTask = tasks.some(t => t.deadline === dateStr && !t.completed);
            const hasEvent = calendarEvents.some(e => e.date === dateStr);
            const isSelected = d === selectedDay;

            return (
              <div key={d} className="py-2 flex flex-col items-center justify-center relative cursor-pointer group" onClick={() => setSelectedDay(d)}>
                <span className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all
                  ${isSelected ? 'text-white shadow-md' : (darkMode ? 'group-hover:bg-gray-700' : 'group-hover:bg-gray-100')}
                `}
                style={isSelected ? { backgroundColor: colors.parisPink } : {}}
                >
                  {d}
                </span>
                <div className="flex gap-1 mt-1 absolute bottom-0">
                  {hasTask && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? colors.parisPink : colors.indigoChild }}></span>}
                  {hasEvent && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? 'white' : '#10b981' }}></span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full md:w-80 space-y-4">
         <div className={`p-6 rounded-3xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
           <h3 className={`font-bold text-lg mb-4 text-center border-b pb-4 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>Agenda: {selectedDateStr}</h3>
           
           <div className="mb-6">
             <h4 className="font-bold text-sm text-gray-500 uppercase tracking-widest mb-3">Custom Events</h4>
             {todaysEvents.length === 0 ? (
               <p className="text-sm text-gray-400 italic">No custom events scheduled.</p>
             ) : (
               <div className="space-y-2">
                 {todaysEvents.map(ev => (
                   <div key={ev.id} className={`flex justify-between items-center p-3 rounded-xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-[#10b981]/10 border-[#10b981]/20'}`}>
                     <span className="font-medium text-sm">{ev.title}</span>
                     <button onClick={() => removeEvent(ev.id)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                   </div>
                 ))}
               </div>
             )}
             
             <form onSubmit={addEvent} className="mt-4 flex flex-col gap-2">
               <input type="text" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} placeholder="Event Title..." className={`px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${darkMode ? 'bg-gray-700 border-gray-600 focus:ring-[#10b981] text-white' : 'bg-gray-50 border-gray-200 focus:ring-[#10b981]'}`} />
               <div className="flex gap-2">
                 <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className={`flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${darkMode ? 'bg-gray-700 border-gray-600 focus:ring-[#10b981] text-white' : 'bg-gray-50 border-gray-200 focus:ring-[#10b981]'}`} required />
                 <button type="submit" className="p-2 rounded-lg bg-[#10b981] text-white hover:bg-[#059669] transition-colors"><Plus size={18}/></button>
               </div>
             </form>
           </div>

           <div>
             <h4 className="font-bold text-sm text-gray-500 uppercase tracking-widest mb-3">Academic Tasks</h4>
             {todaysTasks.length === 0 ? (
               <p className="text-sm text-gray-400 italic">No academic tasks due.</p>
             ) : (
               <div className={`space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent ${darkMode ? 'before:via-gray-600' : 'before:via-gray-300'} before:to-transparent`}>
                 {todaysTasks.map((task) => {
                   const subject = subjects.find(s => s.id === task.subjectId) || { name: 'Task', color: colors.creamsicle };
                   return (
                     <div key={task.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border-4 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${darkMode ? 'border-gray-800' : 'border-white'}`} style={{ backgroundColor: task.completed ? '#22c55e' : subject.color }}>
                          {task.completed && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <div className={`w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl shadow-sm border ${task.completed ? 'opacity-60' : ''} ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="font-bold text-[10px] uppercase tracking-wider mb-1" style={{ color: subject.color }}>{subject.name}</div>
                          <div className={`text-sm font-medium ${task.completed ? 'line-through' : ''}`}>{task.title}</div>
                        </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </div>

         </div>
      </div>
    </div>
  );
}

// --- Mind Board View ---
function BrainstormView({ darkMode, colors, notes, setNotes }) {
  const colorOptions = [colors.creamsicle, colors.ibisPink, colors.indigoChild, colors.parisPink];
  const placeholders = ["put your thoughts here...", "manifest your wishes here...", "brainstorm ideas here...", "what's on your mind?"];

  const getPlaceholder = () => placeholders[Math.floor(Math.random() * placeholders.length)];

  const addNote = (color) => setNotes([...notes, { id: Date.now(), text: '', color, placeholder: getPlaceholder() }]);
  const updateNote = (id, text) => setNotes(notes.map(n => n.id === id ? { ...n, text } : n));
  const deleteNote = (id) => setNotes(notes.filter(n => n.id !== id));

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Mind Board</h2>
        <div className={`flex gap-2 p-2 rounded-xl shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <span className="text-sm font-medium mr-2 self-center text-gray-500">New Note:</span>
          {colorOptions.map(c => (
            <button key={c} onClick={() => addNote(c)} className="w-8 h-8 rounded-full border shadow-sm hover:scale-110 transition-transform" style={{ backgroundColor: c, borderColor: 'rgba(0,0,0,0.1)' }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start">
        {notes.length === 0 && <p className="text-gray-400 italic col-span-full text-center mt-10">Your mind board is clear. Add a note to start brainstorming!</p>}
        {notes.map(note => (
          <div key={note.id} className="relative p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow min-h-[200px] flex flex-col transform rotate-1 hover:rotate-0 group" style={{ backgroundColor: note.color }}>
            <div className="w-full flex justify-end mb-2">
              <button onClick={() => deleteNote(note.id)} className="text-black/30 hover:text-black/70 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
            </div>
            <textarea 
               className="flex-1 w-full bg-transparent border-none resize-none focus:outline-none text-gray-800 font-medium placeholder-gray-800/40" 
               placeholder={note.placeholder || "put your thoughts here..."} 
               value={note.text} 
               onChange={(e) => updateNote(note.id, e.target.value)} 
            />
            <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-l-[20px] border-t-white/30 border-l-transparent pointer-events-none rounded-bl"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Grades View ---
function GradesView({ darkMode, colors, subjects, gradesData, setGradesData }) {
  const [mode, setMode] = useState('student');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');

  const midterms = gradesData[selectedSubjectId]?.midterms || [];
  const finals = gradesData[selectedSubjectId]?.finals || [];
  
  const revieweeLogs = gradesData.globalRevieweeLogs || [];

  const updateSubjectGrades = (term, data) => {
    if (!selectedSubjectId) return;
    setGradesData({
      ...gradesData,
      [selectedSubjectId]: {
        ...(gradesData[selectedSubjectId] || {}),
        [term]: data
      }
    });
  };

  const updateGlobalRevieweeLogs = (data) => {
    setGradesData({ ...gradesData, globalRevieweeLogs: data });
  };

  const [gradingScale, setGradingScale] = useState([
    { id: 1, min: 96, max: 100, grade: '4.0' },
    { id: 2, min: 90, max: 95, grade: '3.5' },
    { id: 3, min: 84, max: 89, grade: '3.0' },
    { id: 4, min: 78, max: 83, grade: '2.5' },
    { id: 5, min: 72, max: 77, grade: '2.0' },
    { id: 6, min: 66, max: 71, grade: '1.5' },
    { id: 7, min: 60, max: 65, grade: '1.0' },
    { id: 8, min: 0, max: 59, grade: 'R' }
  ]);

  const handleStudentChange = (term, id, field, value) => {
    const data = term === 'midterms' ? midterms : finals;
    const updatedData = data.map(item => item.id === id ? { ...item, [field]: field === 'name' ? value : Number(value) } : item);
    updateSubjectGrades(term, updatedData);
  };
  const addStudentItem = (term) => {
    const data = term === 'midterms' ? midterms : finals;
    const updatedData = [...data, { id: Date.now(), name: 'New Assessment', obtained: 0, total: 100, weight: 10 }];
    updateSubjectGrades(term, updatedData);
  };
  const removeStudentItem = (term, id) => {
    const data = term === 'midterms' ? midterms : finals;
    const updatedData = data.filter(item => item.id !== id);
    updateSubjectGrades(term, updatedData);
  };
  const moveStudentItem = (term, index, dir) => {
    const data = [...(term === 'midterms' ? midterms : finals)];
    if (index + dir < 0 || index + dir >= data.length) return;
    const temp = data[index];
    data[index] = data[index + dir];
    data[index + dir] = temp;
    updateSubjectGrades(term, data);
  };

  const handleScaleChange = (id, field, value) => {
    setGradingScale(prev => prev.map(item => item.id === id ? { ...item, [field]: field === 'grade' ? value : Number(value) } : item));
  };
  const addScaleItem = () => setGradingScale([...gradingScale, { id: Date.now(), min: 0, max: 0, grade: '0.0' }]);
  const removeScaleItem = (id) => setGradingScale(gradingScale.filter(item => item.id !== id));

  const handleRevieweeChange = (id, field, value) => {
    const updatedData = revieweeLogs.map(item => item.id === id ? { ...item, [field]: field === 'name' ? value : Number(value) } : item);
    updateGlobalRevieweeLogs(updatedData);
  };
  const addRevieweeItem = () => {
    const updatedData = [...revieweeLogs, { id: Date.now(), name: 'New Exam', obtained: 0, total: 100 }];
    updateGlobalRevieweeLogs(updatedData);
  };
  const removeRevieweeItem = (id) => {
    const updatedData = revieweeLogs.filter(item => item.id !== id);
    updateGlobalRevieweeLogs(updatedData);
  };

  const interpretGrade = (percent) => {
    if (percent === 0) return '-';
    const roundedPercent = Math.round(percent);
    const match = gradingScale.find(scale => roundedPercent >= scale.min && roundedPercent <= scale.max);
    return match ? match.grade : 'N/A';
  };

  const calcSection = (items) => {
    let weightedSum = 0; let weightTotal = 0;
    items.forEach(i => { if (i.total > 0 && i.weight > 0) { weightedSum += (i.obtained / i.total) * i.weight; weightTotal += i.weight; } });
    return weightTotal > 0 ? (weightedSum / weightTotal) * 100 : 0;
  };

  const midPerc = calcSection(midterms);
  const finPerc = calcSection(finals);
  const overallPerc = calcSection([...midterms, ...finals]);

  let revObtained = 0; let revTotal = 0; let below65Count = 0;
  revieweeLogs.forEach(i => {
    revObtained += i.obtained; revTotal += i.total;
    if (i.total > 0 && (i.obtained / i.total) * 100 < 65) below65Count++;
  });
  const revCumulative = revTotal > 0 ? (revObtained / revTotal) * 100 : 0;
  
  let revStatus = 'Failed';
  let statusColor = darkMode ? 'text-red-400 bg-red-900/30' : 'text-red-500 bg-red-100';
  if (revCumulative >= 75) {
    if (below65Count === 0) { revStatus = 'Passed'; statusColor = darkMode ? 'text-green-400 bg-green-900/30' : 'text-green-600 bg-green-100'; }
    else if (below65Count <= 2) { revStatus = 'Conditional'; statusColor = darkMode ? 'text-yellow-400 bg-yellow-900/30' : 'text-yellow-600 bg-yellow-100'; }
  }

  const panelBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const itemBg = darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200';
  const inputBg = darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800';
  const inputClass = `px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 ${darkMode ? 'bg-gray-700 border-gray-600 focus:ring-[#a4a2cc] text-white' : 'bg-gray-50 border-gray-200 focus:ring-[#fbceb7]'}`;

  if (!selectedSubjectId && subjects.length > 0) {
    setSelectedSubjectId(subjects[0].id);
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col space-y-6">
      
      <div className="flex justify-between items-center flex-wrap gap-4 mb-2">
        <h2 className="text-3xl font-bold">Grade Computation</h2>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
            <button onClick={() => setMode('student')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'student' ? (darkMode ? 'bg-gray-600 shadow-sm text-white' : 'bg-white shadow-sm text-gray-900') : 'text-gray-500'}`}>Student</button>
            <button onClick={() => setMode('reviewee')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'reviewee' ? (darkMode ? 'bg-gray-600 shadow-sm text-white' : 'bg-white shadow-sm text-gray-900') : 'text-gray-500'}`}>Reviewee</button>
          </div>

          {mode === 'student' && (
            <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className={`${inputClass} min-w-[200px]`}>
              {subjects.length === 0 && <option value="">Add subjects first...</option>}
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {subjects.length === 0 && mode === 'student' ? (
        <div className={`p-12 text-center rounded-3xl border shadow-sm ${panelBg}`}>
          <BookOpen size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-500 mb-2">No Subjects Found</h3>
          <p className="text-gray-400">Head over to your Dashboard to add your CPA subjects before computing grades.</p>
        </div>
      ) : mode === 'student' ? (
        <div className="space-y-6">
          <div className={`p-8 rounded-3xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-6 ${panelBg}`}>
            <div className="flex items-center gap-6">
              <div>
                <h3 className="text-sm text-gray-500 font-medium uppercase tracking-wide">Overall Running Grade</h3>
                <p className="text-5xl font-black mt-1" style={{ color: colors.mauveMemento }}>{overallPerc.toFixed(2)}%</p>
              </div>
              <div className={`h-16 w-px mx-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <div>
                <h3 className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-2">GWA Equivalent</h3>
                <div className={`inline-block px-5 py-2 rounded-xl text-2xl font-black shadow-inner ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`} style={{ color: colors.parisPink }}>{interpretGrade(overallPerc)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className={`p-6 rounded-3xl border shadow-sm flex flex-col h-full ${panelBg}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold capitalize">Midterms</h3>
                <div className="text-right">
                  <span className="text-sm text-gray-500 block">Section Grade</span>
                  <span className="text-xl font-black" style={{ color: colors.mauveMemento }}>{calcSection(midterms).toFixed(2)}%</span>
                </div>
              </div>
              {midterms.length === 0 && <p className="text-gray-400 italic text-center py-4">No assessments added.</p>}
              <div className="flex-1 space-y-3 mb-4">
                {midterms.map((item, i) => (
                  <div key={item.id} className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border ${itemBg}`}>
                    <div className="flex flex-col gap-1 text-gray-400">
                      <button onClick={() => moveStudentItem('midterms', i, -1)} className={`transition-colors hover:text-gray-700`}><ArrowUp size={14}/></button>
                      <button onClick={() => moveStudentItem('midterms', i, 1)} className={`transition-colors hover:text-gray-700`}><ArrowDown size={14}/></button>
                    </div>
                    <input type="text" value={item.name} onChange={e => handleStudentChange('midterms', item.id, 'name', e.target.value)} className={`flex-1 min-w-[80px] px-3 py-2 rounded-lg border text-sm ${inputBg}`} placeholder="Assessment" />
                    <div className="flex items-center gap-1">
                      <input type="number" value={item.obtained === 0 && item.total === 100 ? '' : item.obtained} onChange={e => handleStudentChange('midterms', item.id, 'obtained', e.target.value)} className={`w-12 px-1 sm:px-2 py-2 text-center rounded-lg border text-sm ${inputBg}`} />
                      <span className="text-gray-400 font-bold">/</span>
                      <input type="number" value={item.total} onChange={e => handleStudentChange('midterms', item.id, 'total', e.target.value)} className={`w-12 px-1 sm:px-2 py-2 text-center rounded-lg border text-sm ${inputBg}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      <input type="number" value={item.weight} onChange={e => handleStudentChange('midterms', item.id, 'weight', e.target.value)} className={`w-12 px-1 sm:px-2 py-2 text-center rounded-lg border text-sm ${inputBg}`} />
                      <span className="text-gray-400 font-bold text-xs">%</span>
                    </div>
                    <button onClick={() => removeStudentItem('midterms', item.id)} className="text-gray-400 hover:text-red-50 transition-colors ml-1"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
              <button onClick={() => addStudentItem('midterms')} className={`w-full py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors flex items-center justify-center gap-2 mt-auto text-gray-500 border-gray-300 hover:text-gray-700 hover:bg-gray-50`}>
                <Plus size={18} /> Add Assessment
              </button>
            </div>

            <div className={`p-6 rounded-3xl border shadow-sm flex flex-col h-full ${panelBg}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold capitalize">Finals</h3>
                <div className="text-right">
                  <span className="text-sm text-gray-500 block">Section Grade</span>
                  <span className="text-xl font-black" style={{ color: colors.mauveMemento }}>{calcSection(finals).toFixed(2)}%</span>
                </div>
              </div>
              {finals.length === 0 && <p className="text-gray-400 italic text-center py-4">No assessments added.</p>}
              <div className="flex-1 space-y-3 mb-4">
                {finals.map((item, i) => (
                  <div key={item.id} className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border ${itemBg}`}>
                    <div className="flex flex-col gap-1 text-gray-400">
                      <button onClick={() => moveStudentItem('finals', i, -1)} className={`transition-colors hover:text-gray-700`}><ArrowUp size={14}/></button>
                      <button onClick={() => moveStudentItem('finals', i, 1)} className={`transition-colors hover:text-gray-700`}><ArrowDown size={14}/></button>
                    </div>
                    <input type="text" value={item.name} onChange={e => handleStudentChange('finals', item.id, 'name', e.target.value)} className={`flex-1 min-w-[80px] px-3 py-2 rounded-lg border text-sm ${inputBg}`} placeholder="Assessment" />
                    <div className="flex items-center gap-1">
                      <input type="number" value={item.obtained === 0 && item.total === 100 ? '' : item.obtained} onChange={e => handleStudentChange('finals', item.id, 'obtained', e.target.value)} className={`w-12 px-1 sm:px-2 py-2 text-center rounded-lg border text-sm ${inputBg}`} />
                      <span className="text-gray-400 font-bold">/</span>
                      <input type="number" value={item.total} onChange={e => handleStudentChange('finals', item.id, 'total', e.target.value)} className={`w-12 px-1 sm:px-2 py-2 text-center rounded-lg border text-sm ${inputBg}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      <input type="number" value={item.weight} onChange={e => handleStudentChange('finals', item.id, 'weight', e.target.value)} className={`w-12 px-1 sm:px-2 py-2 text-center rounded-lg border text-sm ${inputBg}`} />
                      <span className="text-gray-400 font-bold text-xs">%</span>
                    </div>
                    <button onClick={() => removeStudentItem('finals', item.id)} className="text-gray-400 hover:text-red-500 transition-colors ml-1"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
              <button onClick={() => addStudentItem('finals')} className={`w-full py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors flex items-center justify-center gap-2 mt-auto text-gray-500 border-gray-300 hover:text-gray-700 hover:bg-gray-50`}>
                <Plus size={18} /> Add Assessment
              </button>
            </div>
          </div>
          
          <div className="w-full">
            <div className={`p-6 rounded-3xl border shadow-sm flex flex-col w-full ${panelBg}`}>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Settings size={20} style={{ color: colors.indigoChild }} /> Grading Scale
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {[...gradingScale].sort((a,b) => b.min - a.min).map(item => (
                  <div key={item.id} className={`flex items-center gap-1 p-2 rounded-xl border ${itemBg}`}>
                    <div className="flex items-center flex-1">
                      <input type="number" value={item.min} onChange={e => handleScaleChange(item.id, 'min', e.target.value)} className={`w-full px-1 py-1.5 text-center rounded-lg border text-sm ${inputBg}`} />
                    </div>
                    <span className={`font-medium ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>-</span>
                    <div className="flex items-center flex-1">
                      <input type="number" value={item.max} onChange={e => handleScaleChange(item.id, 'max', e.target.value)} className={`w-full px-1 py-1.5 text-center rounded-lg border text-sm ${inputBg}`} />
                    </div>
                    <div className="flex-1 ml-1">
                      <input type="text" value={item.grade} onChange={e => handleScaleChange(item.id, 'grade', e.target.value)} className={`w-full px-1 py-1.5 text-center rounded-lg border text-sm font-bold ${inputBg}`} />
                    </div>
                    <button onClick={() => removeScaleItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
              <button onClick={addScaleItem} className={`w-full py-3 rounded-xl font-bold text-sm border-2 border-dashed transition-colors flex items-center justify-center gap-2 text-gray-500 border-gray-300 hover:text-gray-700 hover:bg-gray-50`}>
                <Plus size={18} /> Add Range
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className={`flex-1 w-full p-8 rounded-3xl border shadow-sm ${panelBg}`}>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><BookOpen size={20} style={{ color: colors.indigoChild }} /> Global Mock Exam Logs</h3>
            {revieweeLogs.length === 0 && <p className="text-gray-400 italic text-center py-4 mb-6">No exams logged yet.</p>}
            
            <div className="space-y-4 mb-6">
              {revieweeLogs.map((item) => (
                <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border ${itemBg}`}>
                  <input type="text" value={item.name} onChange={e => handleRevieweeChange(item.id, 'name', e.target.value)} className={`flex-1 px-4 py-3 rounded-xl border font-medium ${inputBg}`} placeholder="e.g. FAR Pre-board 1" />
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className={`flex items-center rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-[#a4a2cc] ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                      <input type="number" value={item.obtained === 0 && item.total === 100 && item.name === 'New Exam' ? '' : item.obtained} onChange={e => handleRevieweeChange(item.id, 'obtained', e.target.value)} className="w-16 px-3 py-3 text-center bg-transparent outline-none font-bold" />
                      <span className={`font-bold ${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>/</span>
                      <input type="number" value={item.total} onChange={e => handleRevieweeChange(item.id, 'total', e.target.value)} className="w-16 px-3 py-3 text-center bg-transparent outline-none text-gray-500" />
                    </div>
                    <span className="w-16 text-right font-bold" style={{ color: item.total > 0 && (item.obtained/item.total)*100 < 65 ? '#ef4444' : colors.mauveMemento }}>
                      {item.total > 0 ? ((item.obtained/item.total)*100).toFixed(1) : 0}%
                    </span>
                    <button onClick={() => removeRevieweeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2"><Trash2 size={20}/></button>
                  </div>
                </div>
              ))}
            </div>
            
            <button onClick={addRevieweeItem} className={`w-full py-4 rounded-2xl font-bold border-2 border-dashed transition-colors flex items-center justify-center gap-2 ${darkMode ? 'text-gray-500 border-gray-600 hover:bg-gray-700' : 'text-gray-500 border-gray-300 hover:text-gray-700 hover:bg-gray-50'}`}>
              <Plus size={20} /> Add Global Exam Log
            </button>
          </div>

          <div className="w-full lg:w-80 space-y-6">
            <div className={`p-8 rounded-3xl border shadow-sm text-center ${panelBg}`}>
              <h3 className="font-bold text-gray-500 uppercase tracking-widest text-xs mb-4">Cumulative Score</h3>
              <div className="text-6xl font-black mb-6" style={{ color: colors.indigoChild }}>
                {revCumulative.toFixed(2)}<span className="text-3xl">%</span>
              </div>
              <div className={`h-px w-full mb-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <h3 className="font-bold text-gray-500 uppercase tracking-widest text-xs mb-3">Overall Status</h3>
              <div className={`px-6 py-3 rounded-2xl font-black text-xl tracking-wide uppercase ${statusColor}`}>
                {revStatus}
              </div>
            </div>

            <div className={`p-6 rounded-3xl border shadow-sm ${panelBg}`}>
               <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Target size={16}/> Passing Criteria</h4>
               <ul className={`space-y-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                 <li className="flex gap-2 leading-relaxed"><span className="text-green-500 font-bold mt-0.5">✓</span> <span><strong className={darkMode ? 'text-gray-200' : 'text-gray-700'}>Passed:</strong> 75% overall, NO exam below 65%</span></li>
                 <li className="flex gap-2 leading-relaxed"><span className="text-yellow-500 font-bold mt-0.5">!</span> <span><strong className={darkMode ? 'text-gray-200' : 'text-gray-700'}>Conditional:</strong> 75% overall, 1-2 exams below 65%</span></li>
                 <li className="flex gap-2 leading-relaxed"><span className="text-red-500 font-bold mt-0.5">✗</span> <span><strong className={darkMode ? 'text-gray-200' : 'text-gray-700'}>Failed:</strong> &lt;75% overall, OR &gt;2 exams below 65%</span></li>
               </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}