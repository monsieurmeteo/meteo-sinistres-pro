import React, { useState, useEffect } from 'react';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import LoginScreen from './components/common/LoginScreen';
import MainDashboard from './modules/dashboard/MainDashboard';
import DossierList from './modules/dossier/DossierList';
import NewDossierWizard from './modules/dossier/NewDossierWizard';
import WeatherAnalysisView from './modules/analysis/WeatherAnalysisView';
import MonthlyClimateTable from './modules/climatology/MonthlyClimateTable';
import { dossierStorageService } from './services/dossierStorageService';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dossiers, setDossiers] = useState([]);
  const [activeDossier, setActiveDossier] = useState(null);

  // Vérifier la session existante
  useEffect(() => {
    const localAuth = localStorage.getItem('mcp_auth_session') === 'true';
    const sessionAuth = sessionStorage.getItem('mcp_auth_session') === 'true';
    const user = localStorage.getItem('mcp_auth_user') || sessionStorage.getItem('mcp_auth_user');

    if (localAuth || sessionAuth) {
      setIsAuthenticated(true);
      setCurrentUser(user || 'assur59');
    }

    const loaded = dossierStorageService.getAll();
    setDossiers(loaded);
  }, []);

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    if (confirm('Voulez-vous vous déconnecter ?')) {
      localStorage.removeItem('mcp_auth_session');
      localStorage.removeItem('mcp_auth_user');
      sessionStorage.removeItem('mcp_auth_session');
      sessionStorage.removeItem('mcp_auth_user');
      setIsAuthenticated(false);
      setCurrentUser('');
    }
  };

  const handleSaveAndAnalyze = (newDossier) => {
    const saved = dossierStorageService.save(newDossier);
    setDossiers(dossierStorageService.getAll());
    setActiveDossier(saved);
    setActiveTab('analysis');
  };

  const handleOpenDossier = (dossier) => {
    setActiveDossier(dossier);
    setActiveTab('analysis');
  };

  const handleDeleteDossier = (id) => {
    if (confirm('Voulez-vous vraiment supprimer ce dossier de sinistre ?')) {
      const updated = dossierStorageService.delete(id);
      setDossiers(updated);
      if (activeDossier && activeDossier.id === id) {
        setActiveDossier(null);
        setActiveTab('dossiers');
      }
    }
  };

  const handleDuplicateDossier = (dossier) => {
    const copy = {
      ...dossier,
      id: 'dossier_' + Date.now(),
      reference: dossierStorageService.generateReference(),
      status: 'Brouillon'
    };
    dossierStorageService.save(copy);
    setDossiers(dossierStorageService.getAll());
  };

  const handleUpdateDossier = (updated) => {
    dossierStorageService.save(updated);
    setDossiers(dossierStorageService.getAll());
    setActiveDossier(updated);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar
        onNewDossier={() => setActiveTab('new')}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <MainDashboard
              dossiers={dossiers}
              onNewDossier={() => setActiveTab('new')}
              onOpenDossier={handleOpenDossier}
              onGoToClim={() => setActiveTab('climatology')}
            />
          )}

          {activeTab === 'dossiers' && (
            <DossierList
              dossiers={dossiers}
              onOpenDossier={handleOpenDossier}
              onNewDossier={() => setActiveTab('new')}
              onDeleteDossier={handleDeleteDossier}
              onDuplicateDossier={handleDuplicateDossier}
            />
          )}

          {activeTab === 'new' && (
            <NewDossierWizard
              onSaveAndAnalyze={handleSaveAndAnalyze}
              onCancel={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'analysis' && activeDossier && (
            <WeatherAnalysisView
              dossier={activeDossier}
              onBack={() => setActiveTab('dossiers')}
              onUpdateDossier={handleUpdateDossier}
            />
          )}

          {activeTab === 'climatology' && (
            <MonthlyClimateTable
              initialStationId="59343001"
              initialStationName="Lille-Lesquin"
            />
          )}
        </main>
      </div>
    </div>
  );
}
