import React, { useState } from 'react';
import { User, Mail, Lock, Key, Settings as SettingsIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

interface UserSettingsPanelProps {
    userEmail: string;
    optimalRange: { min: number; max: number };
    setOptimalRange: (range: { min: number; max: number }) => void;
}

const UserSettingsPanel: React.FC<UserSettingsPanelProps> = ({
    userEmail,
    optimalRange,
    setOptimalRange
}) => {
    const { t } = useTranslation();

    // Reset Password State
    const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
    const [resetPasswordMessage, setResetPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Change Email State
    const [newEmail, setNewEmail] = useState('');
    const [changeEmailLoading, setChangeEmailLoading] = useState(false);
    const [changeEmailMessage, setChangeEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleResetPassword = async () => {
        setResetPasswordLoading(true);
        setResetPasswordMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setResetPasswordMessage({
                type: 'success',
                text: t('userSettings.resetSent')
            });
        } catch (error: any) {
            setResetPasswordMessage({
                type: 'error',
                text: error.message || 'Failed to send reset email'
            });
        } finally {
            setResetPasswordLoading(false);
        }
    };

    const handleChangeEmail = async () => {
        setChangeEmailLoading(true);
        setChangeEmailMessage(null);

        // Validation
        if (!newEmail || !newEmail.includes('@')) {
            setChangeEmailMessage({
                type: 'error',
                text: t('userSettings.invalidEmail')
            });
            setChangeEmailLoading(false);
            return;
        }

        if (newEmail.toLowerCase() === userEmail.toLowerCase()) {
            setChangeEmailMessage({
                type: 'error',
                text: t('userSettings.sameEmail')
            });
            setChangeEmailLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail
            });

            if (error) throw error;

            setChangeEmailMessage({
                type: 'success',
                text: t('userSettings.emailUpdateSent')
            });
            setNewEmail('');
        } catch (error: any) {
            setChangeEmailMessage({
                type: 'error',
                text: error.message || 'Failed to update email'
            });
        } finally {
            setChangeEmailLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto p-6">
            {/* Page Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
                <div className="bg-blue-600 p-3 rounded-xl">
                    <User size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">{t('userSettings.title')}</h1>
                    <p className="text-sm text-slate-400">{userEmail}</p>
                </div>
            </div>

            {/* Account Management Section */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Key className="text-purple-400" size={20} />
                        {t('userSettings.accountManagement')}
                    </h2>
                </div>

                <div className="p-6 space-y-6">
                    {/* Current Email Display */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">
                            {t('userSettings.currentEmail')}
                        </label>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3">
                            <Mail size={16} className="text-slate-500" />
                            <span className="text-slate-200">{userEmail}</span>
                        </div>
                    </div>

                    {/* Reset Password */}
                    <div className="pt-4 border-t border-slate-700">
                        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                            <Lock size={16} className="text-blue-400" />
                            {t('userSettings.resetPassword')}
                        </h3>
                        <p className="text-xs text-slate-400 mb-3">
                            {t('userSettings.resetPasswordDesc')}
                        </p>

                        {resetPasswordMessage && (
                            <div className={`mb-3 p-3 rounded-lg border flex items-center gap-2 text-sm ${resetPasswordMessage.type === 'success'
                                ? 'bg-green-900/30 border-green-500/50 text-green-200'
                                : 'bg-red-900/30 border-red-500/50 text-red-200'
                                }`}>
                                {resetPasswordMessage.type === 'success' ? (
                                    <CheckCircle size={16} />
                                ) : (
                                    <AlertCircle size={16} />
                                )}
                                {resetPasswordMessage.text}
                            </div>
                        )}

                        <Button
                            onClick={handleResetPassword}
                            isLoading={resetPasswordLoading}
                            className="w-full sm:w-auto"
                        >
                            {t('userSettings.sendResetLink')}
                        </Button>
                    </div>

                    {/* Change Email */}
                    <div className="pt-4 border-t border-slate-700">
                        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                            <Mail size={16} className="text-green-400" />
                            {t('userSettings.changeEmail')}
                        </h3>

                        {changeEmailMessage && (
                            <div className={`mb-3 p-3 rounded-lg border flex items-center gap-2 text-sm ${changeEmailMessage.type === 'success'
                                ? 'bg-green-900/30 border-green-500/50 text-green-200'
                                : 'bg-red-900/30 border-red-500/50 text-red-200'
                                }`}>
                                {changeEmailMessage.type === 'success' ? (
                                    <CheckCircle size={16} />
                                ) : (
                                    <AlertCircle size={16} />
                                )}
                                {changeEmailMessage.text}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                    {t('userSettings.newEmail')}
                                </label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="new.email@example.com"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>

                            <Button
                                onClick={handleChangeEmail}
                                isLoading={changeEmailLoading}
                                className="w-full sm:w-auto"
                            >
                                {t('userSettings.updateEmail')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Preferences Section */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <SettingsIcon className="text-green-400" size={20} />
                        {t('userSettings.userPreferences')}
                    </h2>
                </div>

                <div className="p-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            {t('userSettings.optimalRange')}
                        </label>
                        <div className="flex items-center gap-3 mb-2">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={optimalRange.min}
                                onChange={(e) => setOptimalRange({ ...optimalRange, min: parseInt(e.target.value) || 0 })}
                                className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="Min"
                            />
                            <span className="text-slate-500">-</span>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={optimalRange.max}
                                onChange={(e) => setOptimalRange({ ...optimalRange, max: parseInt(e.target.value) || 100 })}
                                className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="Max"
                            />
                            <span className="text-slate-400 text-sm">%</span>
                        </div>
                        <p className="text-xs text-slate-500">
                            {t('userSettings.rangeDesc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserSettingsPanel;
