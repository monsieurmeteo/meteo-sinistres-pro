import React, { useState, useEffect } from 'react';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import MainDashboard from './modules/dashboard/MainDashboard';
import DossierList from './modules/dossier/DossierList';
import NewDossierWizard from './modules/dossier/NewDossierWizard';
import WeatherAnalysisView from './modules/analysis/WeatherAnalysisView';
import MonthlyClimateTable from './modules/climatology/MonthlyClimateTable';
import { dossierStorageService } from './services/dossierStorageService';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dossiers, setDossiers] = useState([]);
  const [activeDossier, setActiveDossier] = useState(null);

  useEffect(() => {
    const loaded = dossierStorageService.getAll();
    setDossiers(loaded);
  }, []);

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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      <Navbar
        onNewDossier={() => setActiveTab('new')}
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
