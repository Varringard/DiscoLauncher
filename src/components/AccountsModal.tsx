import React, { useState } from 'react';
import { X, UserPlus, Trash2, Check, Shield, User, Globe, KeyRound, LogIn, Sparkles } from 'lucide-react';
import { UserAccount } from '../types';
import { CharacterAvatar } from './CharacterAvatar';
import { SkinViewer3D } from './SkinViewer3D';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: UserAccount[];
  activeAccount: UserAccount | null;
  onSelectAccount: (account: UserAccount) => void;
  onSaveAndSelectAccount: (account: UserAccount) => void;
  onRemoveAccount: (id: string) => void;
}

export const AccountsModal: React.FC<AccountsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccount,
  onSelectAccount,
  onSaveAndSelectAccount,
  onRemoveAccount
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'offline' | 'elyby' | 'microsoft'>('offline');
  const [offlineNickname, setOfflineNickname] = useState('');
  
  // Ely.by credentials state
  const [elybyIdentity, setElybyIdentity] = useState('');
  const [elybyPassword, setElybyPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Enter by Nickname (Offline / No-Auth)
  const handleOfflineConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const nick = offlineNickname.trim();
    if (!nick) {
      setErrorMessage('Введите никнейм для игры!');
      return;
    }
    if (!/^[a-zA-Z0-9_]{2,16}$/.test(nick)) {
      setErrorMessage('Никнейм должен содержать от 2 до 16 символов (только латиница, цифры и _)!');
      return;
    }

    setErrorMessage(null);
    const newAcc: UserAccount = {
      id: 'offline_' + nick.toLowerCase(),
      username: nick,
      uuid: 'offline-' + nick.toLowerCase(),
      type: 'offline',
      skinUrl: 'https://minotar.net/skin/' + nick,
      lastUsed: Date.now()
    };

    onSaveAndSelectAccount(newAcc);
    setSuccessMessage('Профиль игрока ' + nick + ' сохранен!');
    setOfflineNickname('');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 1200);
  };

  // 2. Ely.by Account Login via Official AuthServer
  const handleElybyConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const login = elybyIdentity.trim();
    if (!login || !elybyPassword) {
      setErrorMessage('Заполните логин/email и пароль от Ely.by!');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('https://authserver.ely.by/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: login,
          password: elybyPassword,
          clientToken: '00000000-0000-0000-0000-000000000001',
          requestUser: true
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.errorMessage || 'Неверный логин или пароль от аккаунта Ely.by');
      }

      const playerName = data.selectedProfile?.name || login;
      const playerUuid = data.selectedProfile?.id || ('elyby-' + playerName.toLowerCase());

      const newAcc: UserAccount = {
        id: 'elyby_' + playerName.toLowerCase(),
        username: playerName,
        uuid: playerUuid,
        type: 'elyby',
        token: data.accessToken,
        skinUrl: `https://skinsystem.ely.by/skins/${encodeURIComponent(playerName)}.png`,
        capeUrl: `https://skinsystem.ely.by/cloaks/${encodeURIComponent(playerName)}.png`,
        lastUsed: Date.now()
      };

      onSaveAndSelectAccount(newAcc);
      setSuccessMessage('Аккаунт Ely.by ' + playerName + ' успешно подключен!');
      setElybyIdentity('');
      setElybyPassword('');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Ошибка подключения к Ely.by');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Official Microsoft Account
  const handleMicrosoftConnect = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage('Открыто окно авторизации Microsoft... Пожалуйста, войдите в аккаунт');

    try {
      const api = (window as any).electronAPI;
      if (!api?.loginMicrosoft) {
        throw new Error('Функция входа Microsoft недоступна в этой сборке');
      }

      const res = await api.loginMicrosoft();
      if (!res.success) {
        throw new Error(res.error || 'Авторизация Microsoft была отменена');
      }

      const acc: UserAccount = res.account;
      onSaveAndSelectAccount(acc);
      setIsLoading(false);
      setSuccessMessage('Лицензия подключена! Игрок: ' + acc.username);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setIsLoading(false);
      setSuccessMessage(null);
      setErrorMessage(err.message || 'Не удалось выполнить вход через Microsoft');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#0e1420] border border-indigo-950/80 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-indigo-950/60 bg-[#090d16]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Профиль игрока и учетные записи</h2>
              <p className="text-[11px] text-slate-400">3D предпросмотр персонажа, управление скином и смена аккаунтов</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Main Columns (Left: 3D Character, Right: Accounts List & Login) */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[calc(92vh-65px)]">
          {/* Left Column: 3D Character & Skin Actions */}
          <div className="lg:col-span-5 flex flex-col items-center border-b lg:border-b-0 lg:border-r border-indigo-950/60 pb-6 lg:pb-0 lg:pr-6">
            <SkinViewer3D
              activeAccount={activeAccount}
              onSkinUpdated={(newSkinUrl) => {
                if (activeAccount) {
                  onSaveAndSelectAccount({ ...activeAccount, skinUrl: newSkinUrl });
                }
              }}
              width={260}
              height={350}
            />
          </div>

          {/* Right Column: Saved Profiles & Connect Account */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* 1. Saved Accounts List */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Сохраненные профили ({accounts.length})
              </span>

              <div className="overflow-y-auto max-h-[170px] flex flex-col gap-2 pr-1">
                {accounts.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                    Нет добавленных профилей.
                  </div>
                ) : (
                  accounts.map((acc) => {
                    const isActive = activeAccount?.id === acc.id;
                    const isMs = acc.type === 'microsoft';
                    const isEly = acc.type === 'elyby';
                    return (
                      <div
                        key={acc.id}
                        onClick={() => onSelectAccount(acc)}
                        className={'p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ' + (
                          isActive
                            ? 'bg-indigo-600/25 border-indigo-500 ring-1 ring-indigo-500/50 shadow-md'
                            : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CharacterAvatar
                            account={acc}
                            size={28}
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700 bg-slate-950 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              {acc.username}
                              {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                            </div>
                            <div className="text-[10px] flex items-center gap-1 mt-0.5">
                              {isMs ? (
                                <span className="text-sky-400 font-mono font-medium flex items-center gap-1">
                                  <Shield className="w-2.5 h-2.5" /> Лицензия
                                </span>
                              ) : isEly ? (
                                <span className="text-cyan-400 font-mono font-medium flex items-center gap-1">
                                  <Globe className="w-2.5 h-2.5" /> Ely.by
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                                  <User className="w-2.5 h-2.5" /> По нику
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAccount(acc.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Удалить профиль"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Add / Connect Account */}
            <div className="flex flex-col border-t border-indigo-950/60 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Добавить или подключить профиль
              </span>

              {/* Tab navigation */}
              <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 mb-3 text-xs">
                <button
                  type="button"
                  onClick={() => { setActiveTab('offline'); setErrorMessage(null); }}
                  className={'flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ' + (
                    activeTab === 'offline' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  По нику
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('elyby'); setErrorMessage(null); }}
                  className={'flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ' + (
                    activeTab === 'elyby' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Ely.by
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('microsoft'); setErrorMessage(null); }}
                  className={'flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ' + (
                    activeTab === 'microsoft' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Microsoft
                </button>
              </div>

              {/* Error or Success notification */}
              {errorMessage && (
                <div className="p-2.5 mb-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="p-2.5 mb-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                  {successMessage}
                </div>
              )}

              {/* 1. Offline Mode */}
              {activeTab === 'offline' && (
                <form onSubmit={handleOfflineConnect} className="flex flex-col gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Никнейм игрока</label>
                    <input
                      type="text"
                      value={offlineNickname}
                      onChange={(e) => setOfflineNickname(e.target.value)}
                      placeholder="Например, Steve или Alex..."
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-medium"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Сохранить и выбрать профиль
                  </button>
                </form>
              )}

              {/* 2. Ely.by Mode */}
              {activeTab === 'elyby' && (
                <form onSubmit={handleElybyConnect} className="flex flex-col gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Логин или Email на Ely.by</label>
                    <input
                      type="text"
                      value={elybyIdentity}
                      onChange={(e) => setElybyIdentity(e.target.value)}
                      placeholder="Ваш логин или email..."
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 mb-1 block">Пароль от Ely.by</label>
                    <input
                      type="password"
                      value={elybyPassword}
                      onChange={(e) => setElybyPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    {isLoading ? 'Проверка аккаунта Ely.by...' : 'Войти в аккаунт Ely.by'}
                  </button>
                </form>
              )}

              {/* 3. Microsoft Mode */}
              {activeTab === 'microsoft' && (
                <div className="flex flex-col gap-3 text-center p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Безопасная авторизация через окно Microsoft. Скин, плащ и лицензия подгрузятся автоматически.
                  </p>
                  <button
                    type="button"
                    onClick={handleMicrosoftConnect}
                    disabled={isLoading}
                    className="py-2.5 rounded-xl bg-[#00a4ef] hover:bg-[#0091d5] text-white font-bold text-xs shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    {isLoading ? 'Ожидание входа Microsoft...' : 'Войти через Microsoft'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

