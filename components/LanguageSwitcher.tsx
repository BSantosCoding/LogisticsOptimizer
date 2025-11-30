import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'de', name: 'Deutsch' },
        { code: 'pt', name: 'Português' }
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language.split('-')[0]) || languages[0];

    const handleLanguageChange = (langCode: string) => {
        i18n.changeLanguage(langCode);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-all"
                title="Switch Language"
            >
                <Globe size={14} />
                <span className="font-medium">{currentLanguage.name}</span>
                <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full mt-1 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[140px] overflow-hidden">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors ${currentLanguage.code === lang.code
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                {lang.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default LanguageSwitcher;
