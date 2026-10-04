import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './pages/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProyectosPage } from './pages/ProyectosPage';
import { EncuestasPage } from './pages/EncuestasPage';
import { EncuestaDetalle } from './pages/EncuestaDetalle';
import { CrearEncuesta } from './pages/CrearEncuesta';
import { EditarEncuesta } from './pages/EditarEncuesta';
import { RespuestasPage } from './pages/RespuestasPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/home" element={<AppLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="proyectos" element={<ProyectosPage />} />
        <Route path="encuestas" element={<EncuestasPage />} />
        <Route path="encuestas/nueva" element={<EditarEncuesta />} />
        <Route path="encuestas/:id/editar" element={<EditarEncuesta />} />
        <Route path="encuestas/:id/respuestas" element={<RespuestasPage />} />
        <Route path="encuestas/:id" element={<EncuestaDetalle />} />
        <Route path="crear-encuesta" element={<CrearEncuesta />} />
      </Route>

      {/* Agrega aquí /pay, /report-outage, /apply-stop-service cuando existan */}
    </Routes>
  );
};

export default App;
