"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, MapPin, LogOut, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { format, addDays, eachDayOfInterval, endOfMonth, addMonths, isFirstDayOfMonth } from 'date-fns';
import { getChannelStatus, getStreak } from '@/lib/utils';

// FIREBASE IMPORTS
import { auth, db, googleProvider } from '@/lib/firebase';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function YTTracker() {
  const [channels, setChannels] = useState([]);
  const [newName, setNewName] = useState('');
  const [monthsToView, setMonthsToView] = useState(2);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const todayRef = useRef(null);

  const calendarDays = useMemo(() => {
    const start = new Date();
    const end = addMonths(start, monthsToView);
    return eachDayOfInterval({ start, end: endOfMonth(end) });
  }, [monthsToView]);

  // 1. LISTEN FOR AUTH CHANGES
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, "users", u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setChannels(docSnap.data().channels || []);
        }
      } else {
        const saved = localStorage.getItem('yt-data');
        if (saved) setChannels(JSON.parse(saved));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. SYNC DATA
  useEffect(() => {
    if (loading) return;
    if (user) {
      setDoc(doc(db, "users", user.uid), { channels }, { merge: true });
    } else {
      localStorage.setItem('yt-data', JSON.stringify(channels));
    }
  }, [channels, user, loading]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login Error:", err);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') setAuthError("No account found with this email.");
      else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') setAuthError("Incorrect password.");
      else setAuthError(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError("Enter your email first to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to your email!");
    } catch (error) {
      setAuthError("Failed to send reset email.");
    }
  };

  const scrollToToday = () => {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const addChannel = () => {
    if (!newName.trim()) return;
    setChannels([...channels, { id: Date.now(), name: newName, uploads: [] }]);
    setNewName('');
  };

  const deleteChannel = (id) => {
    if (window.confirm("Delete this channel and all data?")) {
      setChannels(channels.filter(c => c.id !== id));
    }
  };

  const toggleDate = (channelId, dateStr) => {
    setChannels(channels.map(ch => {
      if (ch.id === channelId) {
        const isChecked = ch.uploads.includes(dateStr);
        return {
          ...ch,
          uploads: isChecked ? ch.uploads.filter(d => d !== dateStr) : [...ch.uploads, dateStr]
        };
      }
      return ch;
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {!user ? (
          /* UPDATED LOGIN SCREEN */
          <div className="max-w-md mx-auto mt-20 bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-center mb-2">Content Master</h1>
            <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10">
                {isRegistering ? "Join the consistency club" : "Sync across all devices"}
            </p>
            
            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 p-4 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-50 transition-all mb-6 shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
              Continue with Google
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] flex-1 bg-slate-100" />
              <span className="text-[10px] font-black text-slate-300 uppercase">OR</span>
              <div className="h-[1px] flex-1 bg-slate-100" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="email" placeholder="EMAIL ADDRESS"
                  className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border-none outline-none text-[10px] font-bold uppercase"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="PASSWORD"
                  className="w-full p-4 pl-12 pr-12 bg-slate-50 rounded-2xl border-none outline-none text-[10px] font-bold uppercase"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              
              {authError && <p className="text-[9px] font-bold text-red-500 uppercase px-2">{authError}</p>}
              
              <button 
                type="submit"
                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase text-[10px] hover:bg-black transition-all shadow-lg shadow-slate-200"
              >
                {isRegistering ? "Create Account" : "Login"}
              </button>
            </form>

            <div className="mt-8 space-y-4 text-center">
                {!isRegistering && (
                    <button onClick={handleForgotPassword} className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest block w-full">
                        Forgot Password?
                    </button>
                )}
                <button 
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-[10px] font-black text-slate-900 uppercase border-t border-slate-50 pt-4 w-full"
                >
                    {isRegistering ? "Already have an account? Login" : "New here? Create an account"}
                </button>
            </div>
          </div>
        ) : (
          /* MAIN TRACKER INTERFACE */
          <>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3 bg-white border px-4 py-2 rounded-2xl shadow-sm">
                {user.photoURL ? (
                  <img src={user.photoURL} className="w-5 h-5 rounded-full" alt="avatar" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[8px] text-white font-bold uppercase">
                    {user.email ? user.email[0] : 'U'}
                  </div>
                )}
                <span className="text-[9px] font-black uppercase text-slate-400">Cloud Sync Active</span>
                <button onClick={() => signOut(auth)} className="text-red-500 hover:scale-110 transition-transform"><LogOut size={14}/></button>
              </div>
            </div>

            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12 border-b pb-8">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">Content Master</h1>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  {format(new Date(), 'EEEE, MMMM do')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-white p-3 rounded-2xl border flex items-center gap-4 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase">View: {monthsToView}M</span>
                  <input 
                    type="range" min="1" max="12" value={monthsToView} 
                    onChange={(e) => setMonthsToView(parseInt(e.target.value))}
                    className="w-24 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="bg-white p-2 rounded-2xl border flex items-center shadow-sm w-full md:w-64">
                  <input 
                    className="flex-1 px-3 py-1 outline-none text-sm font-bold placeholder:text-slate-200 uppercase"
                    placeholder="CHANNEL NAME..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addChannel()}
                  />
                  <button onClick={addChannel} className="bg-slate-900 text-white p-2 rounded-xl">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </header>

            <div className="flex flex-wrap gap-4 mb-12">
              {channels.map(ch => {
                const status = getChannelStatus(ch.uploads);
                const streak = getStreak(ch.uploads);
                const endDate = status.days > 0 ? format(addDays(new Date(), status.days), 'MMM d') : 'None';
                return (
                  <div key={ch.id} className={`px-5 py-3 rounded-[2rem] border-2 bg-white flex items-center gap-4 shadow-sm ${status.isSafe ? 'border-green-500' : 'border-red-500'}`}>
                    <div>
                      <div className="flex items-center gap-2 leading-none mb-1">
                        <span className="text-xs font-black uppercase">{ch.name}</span>
                        {streak > 0 && <span className="text-orange-500 text-[10px] font-black">🔥 {streak}</span>}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {status.days}D RESERVE • ENDS {endDate}
                      </p>
                    </div>
                    <button onClick={() => deleteChannel(ch.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 mb-20">
              {calendarDays.map((day, index) => {
                const dStr = format(day, 'yyyy-MM-dd');
                const isToday = format(new Date(), 'yyyy-MM-dd') === dStr;
                const isNewMonth = isFirstDayOfMonth(day) && index !== 0;

                return (
                  <React.Fragment key={dStr}>
                    {isNewMonth && (
                      <div className="col-span-full py-8 flex items-center gap-6">
                        <div className="h-[1px] flex-1 bg-slate-200" />
                        <span className="text-sm font-black uppercase tracking-[0.4em] text-slate-300">{format(day, 'MMMM yyyy')}</span>
                        <div className="h-[1px] flex-1 bg-slate-200" />
                      </div>
                    )}

                    <div 
                      ref={isToday ? todayRef : null}
                      className={`bg-white rounded-[2.5rem] border p-6 shadow-sm min-h-[200px] flex flex-col transition-all relative
                        ${isToday ? 'ring-4 ring-blue-600/10 border-blue-600 bg-blue-50/10' : 'border-slate-200'}
                      `}
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <span className={`block text-4xl font-black leading-none tracking-tighter ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>{format(day, 'd')}</span>
                          <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{format(day, 'MMMM')}</span>
                        </div>
                        {isToday && <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase">Today</span>}
                      </div>

                      <div className="space-y-2 mt-auto">
                        {channels.map(ch => {
                          const isChecked = ch.uploads.includes(dStr);
                          return (
                            <button 
                              key={ch.id} onClick={() => toggleDate(ch.id, dStr)}
                              className={`w-full flex items-center justify-between p-3 rounded-2xl text-[10px] font-black transition-all border
                                ${isChecked ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              <span className="truncate max-w-[100px] uppercase">{ch.name}</span>
                              <div className={`w-3.5 h-3.5 rounded-full border-2 ${isChecked ? 'bg-white border-white' : 'border-slate-200'}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="fixed bottom-8 right-8 z-50 flex items-center justify-center">
              <button 
                onClick={scrollToToday}
                className="relative flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-2xl border border-slate-100 hover:scale-110 transition-all group active:scale-95"
              >
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                  <circle
                    cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={2 * Math.PI * 28 * (1 - Math.min(
                      (channels.reduce((acc, ch) => acc + getChannelStatus(ch.uploads).days, 0) / (channels.length || 1)) / 21, 1
                    ))}
                    strokeLinecap="round"
                    className="text-blue-600 transition-all duration-1000"
                  />
                </svg>
                <MapPin size={22} className="text-blue-600 relative z-10" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}