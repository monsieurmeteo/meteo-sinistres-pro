import React, { useState } from 'react';
import { Lock, User, Key, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

const VALID_USER = 'assur59';
const VALID_PASS = 'mto59';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (cleanUser === VALID_USER && cleanPass === VALID_PASS) {
      if (rememberMe) {
        localStorage.setItem('mcp_auth_session', 'true');
        localStorage.setItem('mcp_auth_user', cleanUser);
      } else {
        sessionStorage.setItem('mcp_auth_session', 'true');
        sessionStorage.setItem('mcp_auth_user', cleanUser);
      }
      onLoginSuccess(cleanUser);
    } else {
      setError('Identifiant ou mot de passe incorrect. Veuillez vérifier vos accès.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6">
        {/* Header & Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <img 
              src="/logo_meteo_climat_pro.png" 
              alt="Météo Climat PRO" 
              className="h-14 w-auto object-contain" 
            />
          </div>
          <h1 className="text-xl font-black text-slate-950 tracking-tight">
            Accès Espace Professionnel
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Plateforme d'Expertise & Certification de Sinistres Météorologiques
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Identifiant / Utilisateur
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Votre identifiant (ex: assur59)"
                className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition shadow-2xs"
                autoFocus
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full px-4 py-3 pl-10 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition shadow-2xs"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
              />
              <span>Mémoriser ma session</span>
            </label>
            <span className="text-[11px] text-sky-700 font-bold font-mono">
              Accès Sécurisé
            </span>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition transform hover:-translate-y-0.5 mt-2 cursor-pointer"
          >
            <span>Se connecter à la plateforme</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1 font-semibold text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Données certifiées Météo-France (Normes OMM)
          </p>
          <p>© Météo Climat PRO • Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
}
