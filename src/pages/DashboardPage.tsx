import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  FolderKanban,
  Inbox,
  Mail,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useEstadisticas } from '../hooks/useEstadisticas';
import { ETIQUETAS_ESTADO, plural } from '../services/estadisticasService';

function formatoNumero(valor: number): string {
  return new Intl.NumberFormat('es-MX').format(valor);
}

function formatoFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { estadisticas, cargando, recargar, isOnline } = useEstadisticas();

  if (cargando && !estadisticas) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Cargando datos...
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[#1f2421] mb-1">Dashboard</h1>
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm mt-4">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>No hay datos para mostrar. Revisa la conexión con el servidor.</span>
        </div>
        <button
          onClick={recargar}
          className="mt-4 inline-flex items-center gap-2 bg-[#008751] hover:bg-green-700 text-white rounded px-4 py-2 text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  const { kpis, serie, encuestas, alertas } = estadisticas;
  const maxConsumo = Math.max(...serie.map((s) => s.respuestas), 1);
  const conRespuestas = encuestas.filter((e) => e.respuestas > 0);
  const totalRespuestasSerie = serie.reduce((a, s) => a + s.respuestas, 0);

  const kpisVisibles = [
    {
      label: 'Encuestas',
      value: formatoNumero(kpis.encuestas),
      detalle: plural(conRespuestas.length, 'con respuesta', 'con respuestas'),
      icon: FolderKanban,
      color: '#008751',
    },
    {
      label: 'Respuestas recibidas',
      value: formatoNumero(kpis.respuestas),
      detalle: `${formatoNumero(kpis.coberturaPromedio)}% de cobertura`,
      icon: Inbox,
      color: '#3a7ca5',
    },
    {
      label: 'Invitaciones enviadas',
      value: formatoNumero(kpis.correosEnviados),
      detalle: 'correos con el link de respuesta',
      icon: Mail,
      color: '#1f2421',
    },
    {
      label: 'Alertas activas',
      value: formatoNumero(kpis.alertas),
      detalle:
        kpis.alertas === 0
          ? 'ninguna requiere atención'
          : kpis.alertas === 1
            ? '1 encuesta requiere atención'
            : `${kpis.alertas} encuestas requieren atención`,
      icon: AlertTriangle,
      color: '#c0392b',
    },
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-semibold text-[#1f2421]">Dashboard</h1>
          <p className="text-slate-500">
            Resumen del módulo de encuestas
            {estadisticas.parcial
              ? ' (datos en caché, sin conexión con el servidor)'
              : ` · actualizado ${formatoFecha(estadisticas.generadoEn)}`}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {kpisVisibles.map(({ label, value, detalle, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}1A` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#1f2421]">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{detalle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <p className="text-sm text-slate-500">Cobertura de preguntas</p>
          <p className="text-2xl font-semibold text-[#1f2421] mt-1">
            {formatoNumero(kpis.coberturaPromedio)}%
          </p>
          <p className="text-xs text-slate-400 mt-1">preguntas con al menos una respuesta</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <p className="text-sm text-slate-500">Llenado promedio</p>
          <p className="text-2xl font-semibold text-[#1f2421] mt-1">
            {formatoNumero(kpis.llenadoPromedio)}%
          </p>
          <p className="text-xs text-slate-400 mt-1">de las preguntas contestadas por respuesta</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <p className="text-sm text-slate-500">Respuestas del último semestre</p>
          <p className="text-2xl font-semibold text-[#1f2421] mt-1">
            {formatoNumero(totalRespuestasSerie)}
          </p>
          <p className="text-xs text-slate-400 mt-1">en los últimos {serie.length} meses</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-[#008751]" />
          <h2 className="text-lg font-medium text-[#1f2421]">Respuestas por mes</h2>
        </div>

        {totalRespuestasSerie === 0 ? (
          <p className="text-sm text-slate-500 py-10 text-center">
            Todavía no hay respuestas registradas en este periodo.
          </p>
        ) : (
          <div className="flex items-end gap-6 h-56">
            {serie.map(({ etiqueta, respuestas }) => (
              <div key={etiqueta} className="flex flex-col items-center justify-end flex-1 h-full">
                <span className="text-xs text-slate-500 mb-2">{respuestas}</span>
                <div
                  className="w-full max-w-[48px] bg-[#008751] rounded-t-md transition-all"
                  style={{ height: `${(respuestas / maxConsumo) * 100}%` }}
                />
                <span className="text-sm text-slate-600 mt-2">{etiqueta}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-[#c0392b]" />
          <h2 className="text-lg font-medium text-[#1f2421]">Requieren atención</h2>
        </div>

        {alertas.length === 0 ? (
          <div className="flex items-center gap-3 bg-[#008751]/5 border border-[#008751]/20 rounded-md px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-[#008751] shrink-0" />
            <p className="text-sm text-slate-600">
              Ninguna encuesta está atrasada: todas las que se enviaron tienen respuestas.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertas.map((alerta) => (
              <li key={alerta.id}>
                <button
                  onClick={() => navigate(`/home/encuestas/${alerta.id}`)}
                  className="w-full text-left flex items-center justify-between gap-3 border border-slate-200 rounded-md px-4 py-3 hover:border-[#008751] transition-colors"
                >
                  <span>
                    <span className="block text-sm font-medium text-[#1f2421]">{alerta.titulo}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{alerta.motivo}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {conRespuestas.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-6 mt-6">
          <h2 className="text-lg font-medium text-[#1f2421] mb-4">Encuestas con más respuestas</h2>
          <ul className="flex flex-col gap-3">
            {conRespuestas.slice(0, 5).map((encuesta) => {
              const max = Math.max(...conRespuestas.map((e) => e.respuestas), 1);
              return (
                <li key={encuesta.id}>
                  <button
                    onClick={() => navigate(`/home/encuestas/${encuesta.id}/respuestas`)}
                    className="w-full text-left flex items-center gap-3"
                  >
                    <span className="text-sm text-[#1f2421] w-56 truncate shrink-0">
                      {encuesta.titulo}
                    </span>
                    <span className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <span
                        className="block h-full bg-[#008751]"
                        style={{ width: `${(encuesta.respuestas / max) * 100}%` }}
                      />
                    </span>
                    <span className="text-sm text-slate-500 w-12 text-right shrink-0">
                      {encuesta.respuestas}
                    </span>
                    <span className="text-xs text-slate-400 w-24 text-right shrink-0 hidden sm:block">
                      {ETIQUETAS_ESTADO[encuesta.estado]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
