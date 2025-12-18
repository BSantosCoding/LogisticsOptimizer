import React, { useState } from 'react';
import { User, Mail, Lock, Key, Settings as SettingsIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
                text: error.message || t('userSettings.resetError')
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
                text: error.message || t('userSettings.emailUpdateError')
            });
        } finally {
            setChangeEmailLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto p-6">
            {/* Page Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="bg-primary/10 p-3 rounded-xl">
                    <User size={24} className="text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{t('userSettings.title')}</h1>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
            </div>

            {/* Account Management Section */}
            <Card>
                <CardHeader className="p-4 py-3 border-b border-border bg-muted/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Key className="text-primary" size={16} />
                        {t('userSettings.accountManagement')}
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    {/* Current Email Display */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            {t('userSettings.currentEmail')}
                        </Label>
                        <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-4 py-3">
                            <Mail size={16} className="text-muted-foreground" />
                            <span>{userEmail}</span>
                        </div>
                    </div>

                    {/* Reset Password */}
                    <div className="pt-4 border-t border-border">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Lock size={16} className="text-primary" />
                            {t('userSettings.resetPassword')}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3">
                            {t('userSettings.resetPasswordDesc')}
                        </p>

                        {resetPasswordMessage && (
                            <div className={`mb-3 p-3 rounded-lg border flex items-center gap-2 text-sm ${resetPasswordMessage.type === 'success'
                                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                : 'bg-destructive/10 border-destructive/30 text-destructive'
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
                            disabled={resetPasswordLoading}
                            className="w-full sm:w-auto"
                        >
                            {resetPasswordLoading ? t('userSettings.sending') : t('userSettings.sendResetLink')}
                        </Button>
                    </div>

                    {/* Change Email */}
                    <div className="pt-4 border-t border-border">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Mail size={16} className="text-primary" />
                            {t('userSettings.changeEmail')}
                        </h3>

                        {changeEmailMessage && (
                            <div className={`mb-3 p-3 rounded-lg border flex items-center gap-2 text-sm ${changeEmailMessage.type === 'success'
                                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                                : 'bg-destructive/10 border-destructive/30 text-destructive'
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
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    {t('userSettings.newEmail')}
                                </Label>
                                <Input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="new.email@example.com"
                                    className="bg-muted/30 border-input/50"
                                />
                            </div>

                            <Button
                                onClick={handleChangeEmail}
                                disabled={changeEmailLoading}
                                className="w-full sm:w-auto"
                            >
                                {changeEmailLoading ? t('userSettings.updating') : t('userSettings.updateEmail')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* User Preferences Section */}
            <Card>
                <CardHeader className="p-4 py-3 border-b border-border bg-muted/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <SettingsIcon className="text-primary" size={16} />
                        {t('userSettings.userPreferences')}
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            {t('userSettings.optimalRange')}
                        </Label>
                        <div className="flex items-center gap-3 mb-2">
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={optimalRange.min}
                                onChange={(e) => setOptimalRange({ ...optimalRange, min: parseInt(e.target.value) || 0 })}
                                className="w-24 bg-muted/30 border-input/50"
                                placeholder={t('userSettings.minPlaceholder')}
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={optimalRange.max}
                                onChange={(e) => setOptimalRange({ ...optimalRange, max: parseInt(e.target.value) || 100 })}
                                className="w-24 bg-muted/30 border-input/50"
                                placeholder={t('userSettings.maxPlaceholder')}
                            />
                            <span className="text-muted-foreground text-sm">%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('userSettings.rangeDesc')}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserSettingsPanel;
