"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, doc } from "firebase/firestore";
import { Plus, Trash2, Save, X, UploadCloud, Instagram, Edit2, AlertCircle, Search } from "lucide-react";
import { usePopup } from "@/components/PopupProvider";
import Button from "@/components/Button";
import Image from "next/image";
import { useTranslations, useLocale } from 'next-intl';
import Emoji from "@/components/Emoji"; 

// Using relative path to guarantee it works without alias issues
import { WORLD_FLAGS } from "../../lib/flags";

// 📚 MASSIVELY EXPANDED DICTIONARY FOR AUTO-TRANSLATION
const DICTIONARY = {
  // Genres
  'bachata': 'Бачата',
  'salsa': 'Салса',
  'kizomba': 'Кизомба',
  'zouk': 'Зук',
  
  // Europe
  'spain': 'Испания',
  'romania': 'Румъния',
  'france': 'Франция',
  'bulgaria': 'България',
  'italy': 'Италия',
  'germany': 'Германия',
  'greece': 'Гърция',
  'turkey': 'Турция',
  'serbia': 'Сърбия',
  'north macedonia': 'Северна Македония',
  'macedonia': 'Македония',
  'portugal': 'Португалия',
  'poland': 'Полша',
  'netherlands': 'Нидерландия',
  'belgium': 'Белгия',
  'switzerland': 'Швейцария',
  'sweden': 'Швеция',
  'norway': 'Норвегия',
  'finland': 'Финландия',
  'denmark': 'Дания',
  'austria': 'Австрия',
  'hungary': 'Унгария',
  'czechia': 'Чехия',
  'czech republic': 'Чехия',
  'slovakia': 'Словакия',
  'croatia': 'Хърватия',
  'uk': 'Великобритания',
  'united kingdom': 'Великобритания',
  'ireland': 'Ирландия',
  'russia': 'Русия',
  'ukraine': 'Украйна',
  'cyprus': 'Кипър',
  
  // Americas
  'usa': 'САЩ',
  'united states': 'САЩ',
  'cuba': 'Куба',
  'mexico': 'Мексико',
  'colombia': 'Колумбия',
  'argentina': 'Аржентина',
  'brazil': 'Бразилия',
  'peru': 'Перу',
  'venezuela': 'Венецуела',
  'chile': 'Чили',
  'ecuador': 'Еквадор',
  'puerto rico': 'Пуерто Рико',
  'dominican republic': 'Доминиканска Република',
  'panama': 'Панама',
  'costa rica': 'Коста Рика',
  'canada': 'Канада',
  'uruguay': 'Уругвай',
  'paraguay': 'Парагвай',
  'bolivia': 'Боливия',

  // Asia / Oceania / Africa (Common ones)
  'japan': 'Япония',
  'china': 'Китай',
  'south korea': 'Южна Корея',
  'india': 'Индия',
  'australia': 'Австралия',
  'new zealand': 'Нова Зеландия',
  'egypt': 'Египет',
  'morocco': 'Мароко',
  'south africa': 'Южна Африка',
  'israel': 'Израел',
  'uae': 'ОАЕ',
  'united arab emirates': 'Обединени Арабски Емирства'
};

// 🌟 CUSTOM SEARCHABLE DROPDOWN COMPONENT
function SearchableFlagSelect({ value, onChange, placeholder, onClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFlags = WORLD_FLAGS.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const selected = WORLD_FLAGS.find(c => c.flag === value);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[52px] px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-slate-900 outline-none flex items-center justify-between cursor-pointer transition-colors hover:border-slate-400"
      >
        {selected ? (
          <span className="flex items-center gap-3 min-w-0 pr-2">
            <span className="text-xl shrink-0">{selected.flag}</span> 
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-slate-400 font-medium truncate">{placeholder}</span>
        )}
        
        {value && onClear ? (
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-slate-400 hover:text-red-500 transition-colors p-1 shrink-0"><X size={16}/></button>
        ) : (
          <span className="text-slate-300 text-[10px] shrink-0">▼</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-gray-100 bg-slate-50 flex items-center gap-2">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              className="w-full bg-transparent outline-none text-sm font-medium text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredFlags.map((c, i) => (
              <div
                key={i}
                onClick={() => { onChange(c.flag); setIsOpen(false); setSearchTerm(''); }}
                className="px-4 py-3 hover:bg-salsa-pink/10 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
              >
                <span className="text-xl leading-none">{c.flag}</span>
                <span className="font-medium text-slate-700 text-sm truncate">{c.name}</span>
              </div>
            ))}
            {filteredFlags.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">Not found</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArtistsTab({ artists, onStageChange }) {
  const t = useTranslations('AdminArtistsTab');
  const locale = useLocale();
  const { showPopup } = usePopup();

  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "", genreEn: "", genreBg: "", countryEn: "", countryBg: "",
    flag1: "🇪🇸", flag2: "", instagramUrl: "", imageUrl: "", file: null
  });

  const fileInputRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  const handleOpenModal = (artist = null) => {
    setErrors({});
    if (artist) {
      setEditingId(artist.id);
      
      const flags = artist.flag ? artist.flag.split(' ') : [];
      const f1 = flags[0] || "🇪🇸";
      const f2 = flags[1] || "";

      setFormData({
        name: artist.name || "",
        genreEn: artist.genre?.en || "", genreBg: artist.genre?.bg || "",
        countryEn: artist.country?.en || "", countryBg: artist.country?.bg || "",
        flag1: f1,
        flag2: f2,
        instagramUrl: artist.instagramUrl || "",
        imageUrl: artist.imageUrl || "",
        file: null
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", genreEn: "", genreBg: "", countryEn: "", countryBg: "", flag1: "🇪🇸", flag2: "", instagramUrl: "", imageUrl: "", file: null });
    }
    document.body.style.overflow = "hidden";
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    document.body.style.overflow = "auto";
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const handleGenreEnChange = (e) => {
    const val = e.target.value.toUpperCase();
    const searchVal = val.trim().toLowerCase();
    const bgVal = DICTIONARY[searchVal] ? DICTIONARY[searchVal].toUpperCase() : formData.genreBg;
    
    setFormData(prev => ({ ...prev, genreEn: val, genreBg: bgVal }));
    setErrors(prev => { const n = {...prev}; delete n.genreEn; delete n.genreBg; return n; });
  };

  const handleCountryEnChange = (e) => {
    const val = e.target.value.toUpperCase();
    const searchVal = val.toLowerCase();
    
    // Split input by "&", "and", "," or "/"
    const parts = searchVal.split(/\s*(?:&|and|,|\/)\s*/i).map(p => p.trim()).filter(Boolean);
    
    let foundFlag1 = formData.flag1;
    let foundFlag2 = formData.flag2;
    let bgVal = formData.countryBg;

    if (parts.length > 0) {
      const match1 = WORLD_FLAGS.find(c => c.name.toLowerCase() === parts[0]);
      if (match1) foundFlag1 = match1.flag;
    }
    
    if (parts.length > 1) {
      const match2 = WORLD_FLAGS.find(c => c.name.toLowerCase() === parts[1]);
      if (match2) foundFlag2 = match2.flag;
    } else if (parts.length === 1 && !searchVal.includes('&') && !searchVal.includes('and')) {
      foundFlag2 = ""; 
    }

    if (parts.length === 1 && DICTIONARY[parts[0]]) {
      bgVal = DICTIONARY[parts[0]].toUpperCase();
    } else if (parts.length === 2 && DICTIONARY[parts[0]] && DICTIONARY[parts[1]]) {
      bgVal = (DICTIONARY[parts[0]] + " & " + DICTIONARY[parts[1]]).toUpperCase();
    }

    setFormData(prev => ({
      ...prev,
      countryEn: val,
      countryBg: bgVal,
      flag1: foundFlag1,
      flag2: foundFlag2
    }));
    
    setErrors(prev => { const n = {...prev}; delete n.countryEn; delete n.countryBg; return n; });
  };

  const handleFile = (file) => {
    if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800; 
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);

          setFormData(prev => ({ ...prev, file: file, imageUrl: compressedBase64 }));
          setErrors(prev => { const n = {...prev}; delete n.imageUrl; return n; });
        };
      };
      reader.readAsDataURL(file);
    } else {
      showPopup({ type: "error", title: "Invalid File", message: "Please upload a PNG, JPG, or WEBP file." });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.genreEn.trim()) newErrors.genreEn = true;
    if (!formData.genreBg.trim()) newErrors.genreBg = true;
    if (!formData.countryEn.trim()) newErrors.countryEn = true;
    if (!formData.countryBg.trim()) newErrors.countryBg = true;
    if (!formData.instagramUrl.trim()) newErrors.instagramUrl = true;
    if (!formData.imageUrl) newErrors.imageUrl = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const combinedFlags = [formData.flag1, formData.flag2].filter(Boolean).join(' ');

    const payload = {
      name: formData.name.trim(),
      genre: { en: formData.genreEn.trim(), bg: formData.genreBg.trim() },
      country: { en: formData.countryEn.trim(), bg: formData.countryBg.trim() },
      flag: combinedFlags,
      instagramUrl: formData.instagramUrl.trim(),
      imageUrl: formData.imageUrl.trim(),
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      onStageChange('artists', editingId, payload);
    } else {
      const newId = doc(collection(db, "artists")).id;
      onStageChange('artists', newId, { ...payload, createdAt: new Date().toISOString(), isNew: true });
    }
    handleCloseModal();
  };

  const handleDelete = (id, name) => {
    showPopup({
      type: "danger", title: t('deleteTitle'), message: t('deleteMsg', { name }), confirmText: t('deleteConfirm'), cancelText: t('cancel'),
      onConfirm: () => onStageChange('artists', id, { _deleted: true })
    });
  };

  const inputClass = (hasError) => `
    w-full h-[52px] px-5 bg-white border rounded-xl text-sm font-bold text-slate-900 outline-none transition-all tracking-wider
    ${hasError ? 'border-red-500 bg-red-50/30' : 'border-gray-200 focus:border-slate-900'}
  `;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-16 pb-6 px-4">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-200" onClick={handleCloseModal}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white shrink-0">
          <h3 className="font-bebas text-3xl uppercase text-slate-900 tracking-wide leading-none">{editingId ? t('editTitle') : t('addTitle')}</h3>
          <button type="button" onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-full transition-colors"><X size={22} /></button>
        </div>
        
        <form onSubmit={handleSave} className="p-8 overflow-y-auto flex-1 flex flex-col space-y-6 custom-scrollbar bg-slate-50/50">
          
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest mb-1">{locale === 'bg' ? 'Липсваща информация' : 'Missing Information'}</p>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-wide">
                  {locale === 'bg' ? 'Моля, попълнете маркираните полета по-долу.' : 'Please complete the highlighted fields below.'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2 shrink-0">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">{t('lblName')}</label>
            <input type="text" maxLength={100} value={formData.name} onChange={e => handleInputChange('name', e.target.value)} className={inputClass(errors.name)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">{t('lblGenreEn')}</label>
              <input type="text" maxLength={50} value={formData.genreEn} onChange={handleGenreEnChange} className={inputClass(errors.genreEn)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">{t('lblGenreBg')}</label>
              <input type="text" maxLength={50} value={formData.genreBg} onChange={e => handleInputChange('genreBg', e.target.value.toUpperCase())} className={inputClass(errors.genreBg)} />
            </div>
          </div>

          {/* ⬇️ MOVED: Countries on their own row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">{t('lblCountryEn')}</label>
              <input type="text" maxLength={50} value={formData.countryEn} onChange={handleCountryEnChange} className={inputClass(errors.countryEn)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">{t('lblCountryBg')}</label>
              <input type="text" maxLength={50} value={formData.countryBg} onChange={e => handleInputChange('countryBg', e.target.value.toUpperCase())} className={inputClass(errors.countryBg)} />
            </div>
          </div>
          
          {/* ⬇️ MOVED: Flags on their own row, right underneath the countries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Flag 1</label>
              <SearchableFlagSelect 
                value={formData.flag1} 
                onChange={(val) => handleInputChange('flag1', val)}
                placeholder="Select flag..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Flag 2</label>
              <SearchableFlagSelect 
                value={formData.flag2} 
                onChange={(val) => handleInputChange('flag2', val)}
                placeholder="Optional"
                onClear={() => handleInputChange('flag2', '')}
              />
            </div>
          </div>

          <div className="space-y-2 shrink-0">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">{t('lblInstagram')}</label>
            <input type="url" maxLength={150} value={formData.instagramUrl} onChange={e => handleInputChange('instagramUrl', e.target.value)} className={inputClass(errors.instagramUrl) + " tracking-normal font-medium text-slate-600"} />
          </div>

          <div className="space-y-2 pt-2 flex-1 flex flex-col min-h-[220px]">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">{t('lblImage')}</label>
            <div 
              className={`relative w-full flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden
                ${errors.imageUrl ? 'border-red-400 bg-red-50/20' : dragActive ? 'border-salsa-pink bg-salsa-pink/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }} 
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }} 
              onDragOver={(e) => e.preventDefault()} 
              onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              
              {formData.imageUrl ? (
                <>
                  <Image src={formData.imageUrl} alt="Preview" fill className="object-contain p-4" />
                  <div className="absolute inset-0 bg-slate-900/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <div className="flex flex-col items-center p-3 px-6 bg-white shadow-2xl rounded-2xl border border-gray-100">
                      <Edit2 size={20} className="text-salsa-pink mb-1" />
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{locale === 'bg' ? 'Смени Снимка' : 'Change Image'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-400 text-center px-6">
                  <UploadCloud size={40} className={`mb-3 transition-transform ${dragActive ? 'scale-110 text-salsa-pink' : ''}`} />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">{locale === 'bg' ? 'Качете снимка тук' : 'Drop artist photo here'}</p>
                  <p className="text-[10px] font-bold opacity-60 mt-1 uppercase">PNG, JPG ONLY</p>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={handleCloseModal} className="bg-gray-50 text-slate-500 hover:text-slate-800 tracking-widest">{t('cancel')}</Button>
          <Button type="submit" variant="primary" onClick={handleSave} icon={Save} className="px-10 tracking-widest">{t('btnSave')}</Button>
        </div>
      </div>
    </div>
  );
  
  const uniqueArtists = Array.from(new Map(artists.map(a => [a.id, a])).values());

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative z-10 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="font-bebas tracking-wide text-4xl text-slate-900 uppercase leading-none">{t('title')}</h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{t('subtitle', { count: uniqueArtists.length })}</p>
        </div>
        <Button onClick={() => handleOpenModal()} variant="primary" icon={Plus} className="w-full md:w-auto shadow-salsa-pink/20 px-8">
          {t('btnAdd')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-8">
        {uniqueArtists.map((artist) => (
          <div key={artist.id} className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-xl bg-slate-100 group">
            {artist.imageUrl && <Image src={artist.imageUrl} alt={artist.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />

            <div className="absolute top-5 right-5 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenModal(artist)} className="p-3 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-lg backdrop-blur-sm transition-all"><Edit2 size={16} /></button>
              <button onClick={() => handleDelete(artist.id, artist.name)} className="p-3 bg-red-500/90 hover:bg-red-500 text-white rounded-full shadow-lg backdrop-blur-sm transition-all"><Trash2 size={16} /></button>
            </div>

            <div className="absolute bottom-5 left-5 right-5 bg-white p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <Emoji className="flex flex-col text-left pr-4 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-salsa-pink mb-1 block truncate">{artist.genre?.[locale] || artist.genre?.en}</span>
                <h3 className="font-bebas text-3xl text-slate-900 tracking-wide leading-none mb-1.5 truncate">{artist.name}</h3>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest truncate">
                  <span className="text-sm shadow-sm leading-none">{artist.flag}</span>
                  <span className="truncate">{artist.country?.[locale] || artist.country?.en}</span>
                </div>
              </Emoji>

              <div className="shrink-0 pl-4 border-l border-gray-100">
                <a href={artist.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center bg-gray-50 hover:bg-salsa-pink text-slate-400 hover:text-white p-3.5 rounded-xl transition-colors">
                  <Instagram size={20} strokeWidth={2.5} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && mounted && createPortal(modalContent, document.body)}
    </div>
  );
}