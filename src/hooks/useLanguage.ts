import { useState, useEffect } from 'react';
import tr from '../locales/tr.json';
import en from '../locales/en.json';

export function useLanguage() {
  const [lang, setLang] = useState<'tr' | 'en'>('tr');

  useEffect(() => {
    const savedLang = localStorage.getItem('ai_publisher_lang') as 'tr' | 'en';
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  const changeLanguage = (newLang: 'tr' | 'en') => {
    setLang(newLang);
    localStorage.setItem('ai_publisher_lang', newLang);
    fetch('/api/v1/set-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: newLang }),
    }).catch(console.error);
  };

  const t = lang === 'tr' ? tr : en;

  return { lang, changeLanguage, t };
}
