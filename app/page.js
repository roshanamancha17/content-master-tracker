"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, MapPin, Download, LogOut, Loader2 } from 'lucide-react';
import { format, addDays, eachDayOfInterval, endOfMonth, addMonths, isFirstDayOfMonth } from 'date-fns';
import { getChannelStatus, getStreak } from '@/lib/utils';

// FIREBASE IMPORTS
import { auth, db, googleProvider } from '@/lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function YTTracker() {
  const [channels, setChannels] = useState([]);
  const [newName, setNewName] = useState('');
  const [monthsToView, setMonthsToView] = useState(2);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const todayRef = useRef(null);

  const calendarDays = useMemo(() => {
    const start = new Date();
    const end = addMonths(start, monthsToView);
    return eachDayOfInterval({ start, end: endOfMonth(end) });
  }, [monthsToView]);

  // 1. LISTEN FOR AUTH CHANGES & LOAD DATA
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
        // Fallback to local storage if logged out
        const saved = localStorage.getItem('yt-data');
        if (saved) setChannels(JSON.parse(saved));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. SYNC DATA TO FIREBASE (OR LOCALSTORAGE)
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
        
        {/* AUTH HEADER */}
        <div className="flex justify-end mb-4">
          {!user ? (
            <button 
              onClick={handleGoogleLogin}
              className="bg-white border px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-slate-50 transition-all"
            >
              Sync with Google
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-white border px-4 py-2 rounded-xl shadow-sm">
              <img src={user.photoURL} className="w-5 h-5 rounded-full" alt="avatar" />
              <span className="text-[9px] font-black uppercase text-slate-400">Cloud Sync Active</span>
              <button onClick={() => signOut(auth)} className="text-red-500"><LogOut size={14}/></button>
            </div>
          )}
        </div>

        {/* HEADER */}
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

        {/* SUMMARY DASHBOARD */}
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

        {/* CALENDAR GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
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
                            ${isChecked ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
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
      </div>

      {/* FLOAT JUMP BUTTON (21 DAY LOGIC) */}
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
    </div>
  );
}