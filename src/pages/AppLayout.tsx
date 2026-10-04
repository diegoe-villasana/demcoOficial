import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Sparkles,
  Download,
  Zap,
  LogOut,
} from 'lucide-react';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${
    isActive ? 'bg-[#008751] text-white' : 'text-slate-300 hover:bg-white/5'
  }`;

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1f2421] text-white flex flex-col shrink-0">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-9 h-9 rounded-full bg-[#008751] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-wide">DEMCO</span>
        </div>

        <nav className="flex-1 px-3 py-6 flex flex-col gap-1">
          <NavLink to="/home/dashboard" className={navItemClass}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>

          <NavLink to="/home/proyectos" className={navItemClass}>
            <FolderKanban className="w-5 h-5" />
            Mis Proyectos
          </NavLink>

          <NavLink to="/home/encuestas" className={navItemClass}>
            <ClipboardList className="w-5 h-5" />
            Encuestas
          </NavLink>

          <button className="flex items-center gap-3 px-4 py-3 rounded-md text-left text-slate-300 hover:bg-white/5 transition-colors">
            <Sparkles className="w-5 h-5" />
            IA
          </button>

          <button className="flex items-center gap-3 px-4 py-3 rounded-md text-left text-slate-300 hover:bg-white/5 transition-colors">
            <Download className="w-5 h-5" />
            Descargar
          </button>
        </nav>

        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-3 px-6 py-4 border-t border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </aside>

      {/* Contenido de cada sección */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
