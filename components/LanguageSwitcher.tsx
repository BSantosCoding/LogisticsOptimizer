import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'de', name: 'Deutsch' },
        { code: 'pt', name: 'Português' }
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language.split('-')[0]) || languages[0];

    const handleLanguageChange = (langCode: string) => {
        i18n.changeLanguage(langCode);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Globe size={14} />
                    <span className="font-medium">{currentLanguage.name}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map(lang => (
                    <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className={currentLanguage.code === lang.code ? 'bg-primary text-primary-foreground' : ''}
                    >
                        {lang.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default LanguageSwitcher;
