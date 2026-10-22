import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  RefreshCw,
  Search,
  Loader2,
  WifiOff,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useEstadisticas } from '../hooks/useEstadisticas';
import {
  CLASES_ESTADO,
  ETIQUETAS_ESTADO,
  plural,
  type EstadoEncuesta,
} from '../services/estadisticasService';

const FILTROS: Array<{ valor: EstadoEncuesta | 'todas'; etiqueta: string }> = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'en_curso', etiqueta: 'En curso' },
  { valor: 'enviada', etiqueta: 'Enviadas' },
  { valor: 'finalizada', etiqueta: 'Finalizadas' },
  { valor: 'retrasada', etiqueta: 'Retrasadas' },
  { valor: 'borrador', etiqueta: 'Borradores' },
];

function formatoFecha(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { dateStyle: 'medium' });
}

function relativo(iso: string | null): string {
  if (!iso) return 'sin actividad';
  const dias = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(dias)) return 'sin actividad';
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  if (dias < 60) return 'hace 1 mes';
  return `hace ${Math.floor(dias / 30)} meses`;
}

export const ProyectosPage: React.FC = () => {
  const navigate = useNavigate();
  const { estadisticas, cargando, recargar, isOnline } = useEstadisticas();
  const [filtro, setFiltro] = useState<EstadoEncuesta | 'todas'>('todas');
  const [busqueda, setBusqueda] = useState('');

  const lista = useMemo(() => {
    const base = estadisticas?.encuestas ?? [];
    const term = busqueda.trim().toLowerCase();
    return base.filter((e) => {
      if (filtro !== 'todas' && e.estado !== filtro) return false;
      if (term && !e.titulo.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [estadisticas, filtro, busqueda]);

  const conteo = useMemo(() => {
    const base = estadisticas?.encuestas ?? [];
    return FILTROS.map((f) => ({
      ...f,
      total:
        f.valor === 'todas'
          ? base.length
          : base.filter((e) => e.estado === f.valor).length,
    }));
  }, [estadisticas]);

  if (cargando && !estadisticas) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando datos...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-semibold text-[#1f2421]">Mis Proyectos</h1>
          <p className="text-slate-500">
            Cada encuesta es un proyecto: estado, avance y respuestas
            {estadisticas?.parcial ? ' (datos en caché, sin conexión)' : ''}
          </p>
        </div>
        <button
          onClick={recargar}
          disabled={cargando}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#1f2421] disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md mt-4">
          <WifiOff className="w-4 h-4" /> Sin conexión: se muestran los últimos datos guardados en el dispositivo.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
        {conteo.map(({ valor, etiqueta, total }) => (
          <button
            key={valor}
            onClick={() => setFiltro(valor)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filtro === valor
                ? 'bg-[#008751] text-white border-[#008751]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#008751]'
            }`}
          >
            {etiqueta} <span className="opacity-70">({total})</span>
          </button>
        ))}

        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar encuesta..."
            className="w-56 border border-slate-300 rounded pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]"
          />
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-10 text-center">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-[#1f2421]">No hay proyectos que mostrar</p>
          <p className="text-sm text-slate-500 mt-1">
            {estadisticas?.encuestas.length
              ? 'Prueba con otro filtro o con otra búsqueda.'
              : 'Crea tu primera encuesta para empezar a darle seguimiento.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-sm font-medium text-slate-500">Proyecto</th>
                <th className="px-5 py-3 text-sm font-medium text-slate-500">Estado</th>
                <th className="px-5 py-3 text-sm font-medium text-slate-500">Avance</th>
                <th className="px-5 py-3 text-sm font-medium text-slate-500">Respuestas</th>
                <th className="px-5 py-3 text-sm font-medium text-slate-500">Última actividad</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/home/encuestas/${p.id}`)}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-5 py-4">
                    <p className="text-[#1f2421] font-medium">{p.titulo}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      v{p.versionNumero} · {plural(p.preguntas, 'pregunta', 'preguntas')}
                      {p.sellada ? ' · sellada' : ''}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                        CLASES_ESTADO[p.estado]
                      }`}
                    >
                      {ETIQUETAS_ESTADO[p.estado]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {p.avance === null ? (
                        <span className="text-sm text-slate-400">—</span>
                      ) : (
                        <>
                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#008751]" style={{ width: `${p.avance}%` }} />
                          </div>
                          <span className="text-sm text-slate-500 whitespace-nowrap">{p.avance}%</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-[#1f2421] font-medium">{p.respuestas}</span>
                    <span className="text-xs text-slate-400 ml-1">
                      {p.cobertura === null ? '' : `(${p.cobertura}% cobertura)`}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-500">{formatoFecha(p.ultimaRespuesta)}</p>
                    <p className="text-xs text-slate-400">{relativo(p.ultimaRespuesta)}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ArrowRight className="w-4 h-4 text-slate-300 inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {estadisticas && estadisticas.alertas.length > 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-md p-5">
          <p className="font-medium text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Encuestas que requieren atención
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {estadisticas.alertas.map((alerta) => (
              <li key={alerta.id}>
                <button
                  onClick={() => navigate(`/home/encuestas/${alerta.id}`)}
                  className="text-sm text-amber-900 hover:underline text-left"
                >
                  <span className="font-medium">{alerta.titulo}</span> — {alerta.motivo}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
