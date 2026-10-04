import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Inbox, AlertCircle, MessageSquare, GitBranch } from 'lucide-react';
import {
  obtenerEncuesta,
  obtenerRespuestasRecibidas,
  obtenerVersionesEnServidor,
  type RespuestaRecibida,
} from '../services/encuestasService';
import { Encuesta, Pregunta, VersionHistorial } from '../db/schema';

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Una matriz se guarda con una clave por fila: `${pregunta.id}-${fila}`.
function valorMatriz(respuesta: RespuestaRecibida, pregunta: Pregunta): Array<{ fila: string; valor: string }> {
  return (pregunta.opciones ?? []).map((fila) => {
    const v = respuesta.respuestas[`${pregunta.id}-${fila}`];
    return { fila, valor: v === undefined ? '' : String(v) };
  });
}

function valorSimple(respuesta: RespuestaRecibida, pregunta: Pregunta): string {
  const v = respuesta.respuestas[pregunta.id];
  if (v === undefined || v === '') return 'Sin responder';
  return String(v);
}

interface Resumen {
  pregunta: Pregunta;
  promedio?: number;
  conteo?: Array<{ etiqueta: string; cantidad: number }>;
  filas?: Array<{ fila: string; promedio: number; total: number }>;
}

function calcularResumen(preguntas: Pregunta[], respuestas: RespuestaRecibida[]): Resumen[] {
  const resumenes: Resumen[] = [];

  for (const pregunta of preguntas) {
    if (pregunta.tipo === 'escala') {
      const numeros = respuestas
        .map((r) => r.respuestas[pregunta.id])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      if (numeros.length === 0) continue;
      const promedio = numeros.reduce((a, b) => a + b, 0) / numeros.length;
      resumenes.push({ pregunta, promedio: Math.round(promedio * 100) / 100 });
      continue;
    }

    if (pregunta.tipo === 'opcion_multiple') {
      const opciones = pregunta.opciones ?? [];
      if (opciones.length === 0) continue;
      const conteo = opciones.map((opcion) => ({
        etiqueta: opcion,
        cantidad: respuestas.filter((r) => String(r.respuestas[pregunta.id] ?? '') === opcion).length,
      }));
      resumenes.push({ pregunta, conteo });
      continue;
    }

    if (pregunta.tipo === 'matriz') {
      const filas = (pregunta.opciones ?? []).map((fila) => {
        const valores = respuestas
          .map((r) => r.respuestas[`${pregunta.id}-${fila}`])
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        return {
          fila,
          promedio: valores.length > 0
            ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100
            : 0,
          total: valores.length,
        };
      });
      if (filas.length === 0) continue;
      resumenes.push({ pregunta, filas });
    }
  }

  return resumenes;
}

function Barra({ valor, maximo }: { valor: number; maximo: number }) {
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className="bg-[#008751] h-2 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

function BloqueVersion({ version, respuestas }: { version: VersionHistorial; respuestas: RespuestaRecibida[] }) {
  if (respuestas.length === 0) return null;

  const resumenes = calcularResumen(version.preguntas, respuestas);
  const textos = version.preguntas
    .filter((p) => p.tipo === 'texto')
    .filter((p) => respuestas.some((r) => String(r.respuestas[p.id] ?? '').trim().length > 0));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-[#008751]" />
        <h2 className="font-semibold text-[#1f2421]">
          Versión {version.numero}
          <span className="font-normal text-slate-500 text-sm ml-2">
            {respuestas.length} respuesta{respuestas.length === 1 ? '' : 's'}
          </span>
        </h2>
      </div>

      {resumenes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <p className="font-medium text-[#1f2421] flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#008751]" /> Resumen
          </p>
          <div className="flex flex-col gap-5">
            {resumenes.map(({ pregunta, promedio, conteo, filas }) => (
              <div key={pregunta.id}>
                <p className="text-sm font-medium text-[#1f2421] mb-2">{pregunta.texto}</p>

                {promedio !== undefined && (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-semibold text-[#008751]">{promedio}</span>
                    <span className="text-sm text-slate-500">de 5 en promedio</span>
                  </div>
                )}

                {conteo && (
                  <div className="flex flex-col gap-2">
                    {conteo.map(({ etiqueta, cantidad }) => {
                      const max = Math.max(...conteo.map((c) => c.cantidad), 0);
                      return (
                        <div key={etiqueta} className="flex items-center gap-3">
                          <span className="text-sm text-slate-700 w-40 shrink-0 truncate">{etiqueta}</span>
                          <div className="flex-1">
                            <Barra valor={cantidad} maximo={max} />
                          </div>
                          <span className="text-sm text-slate-500 w-6 text-right">{cantidad}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {filas && (
                  <div className="flex flex-col gap-1">
                    {filas.map(({ fila, promedio: prom, total }) => (
                      <div key={fila} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{fila}</span>
                        <span className="text-slate-500">{total > 0 ? `${prom} (${total})` : '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {textos.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <p className="font-medium text-[#1f2421] flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-[#008751]" /> Comentarios
          </p>
          <div className="flex flex-col gap-3">
            {textos.map((pregunta) => (
              <div key={pregunta.id}>
                <p className="text-sm font-medium text-slate-500 mb-1">{pregunta.texto}</p>
                {respuestas
                  .map((r) => String(r.respuestas[pregunta.id] ?? '').trim())
                  .filter(Boolean)
                  .map((texto, i) => (
                    <p key={i} className="text-sm text-[#1f2421] bg-slate-50 rounded px-3 py-2 mb-1">
                      {texto}
                    </p>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {respuestas.map((respuesta) => (
          <div key={respuesta.id} className="bg-white border border-slate-200 rounded-md p-4">
            <p className="text-xs text-slate-400 mb-3">{formatearFecha(respuesta.fechaRespuesta)}</p>
            <div className="flex flex-col gap-2">
              {version.preguntas.map((pregunta) =>
                pregunta.tipo === 'matriz' ? (
                  <div key={pregunta.id}>
                    <p className="text-sm font-medium text-slate-500">{pregunta.texto}</p>
                    {valorMatriz(respuesta, pregunta)
                      .filter((m) => m.valor)
                      .map((m) => (
                        <p key={m.fila} className="text-sm text-[#1f2421]">
                          {m.fila}: {m.valor}
                        </p>
                      ))}
                  </div>
                ) : (
                  <div key={pregunta.id} className="flex gap-2 text-sm">
                    <span className="text-slate-500">{pregunta.texto}</span>
                    <span className="text-[#1f2421] font-medium">{valorSimple(respuesta, pregunta)}</span>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const RespuestasPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encuesta, setEncuesta] = useState<Encuesta | null>(null);
  const [versiones, setVersiones] = useState<VersionHistorial[] | null>(null);
  const [respuestas, setRespuestas] = useState<RespuestaRecibida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setCargando(true);
      setError(null);
      setEncuesta((await obtenerEncuesta(id)) ?? null);
      try {
        const [vers, res] = await Promise.all([
          obtenerVersionesEnServidor(id),
          obtenerRespuestasRecibidas(id),
        ]);
        setVersiones(vers);
        setRespuestas(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las respuestas.');
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  if (cargando) {
    return <p className="text-slate-500">Cargando respuestas...</p>;
  }

  if (!encuesta) {
    return (
      <div className="max-w-2xl">
        <button
          onClick={() => navigate('/home/encuestas')}
          className="flex items-center gap-1 text-slate-500 hover:text-[#1f2421] mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <p className="text-slate-500">Encuesta no encontrada en este dispositivo.</p>
      </div>
    );
  }

  const total = respuestas.length;
  const grupos = (versiones ?? [])
    .map((v) => ({
      version: v,
      respuestas: respuestas.filter((r) => r.versionId === v.id),
    }))
    .filter((g) => g.respuestas.length > 0);

  const sinVersion = respuestas.filter((r) => !r.versionId);
  const versionActiva = (versiones ?? []).slice(-1)[0];

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/home/encuestas')}
        className="flex items-center gap-1 text-slate-500 hover:text-[#1f2421] mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <h1 className="text-2xl font-semibold text-[#1f2421] mb-1">Respuestas</h1>
      <p className="text-slate-500 mb-6">
        {encuesta.titulo} — {total} respuesta{total === 1 ? '' : 's'} recibida{total === 1 ? '' : 's'}
        {versionActiva && total > 0 && (
          <span className="text-slate-400"> · versión activa v{versionActiva.numero}</span>
        )}
      </p>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm mb-6">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {total === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-10 text-center">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-[#1f2421]">Todavía no hay respuestas</p>
          <p className="text-sm text-slate-500 mt-1">
            Cuando alguien responda el link del correo, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grupos.map((g) => (
            <BloqueVersion key={g.version.id} version={g.version} respuestas={g.respuestas} />
          ))}

          {sinVersion.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-[#1f2421]">
                Sin versión asociada
                <span className="font-normal text-slate-500 text-sm ml-2">{sinVersion.length}</span>
              </h2>
              {sinVersion.map((respuesta) => (
                <div key={respuesta.id} className="bg-white border border-slate-200 rounded-md p-4">
                  <p className="text-xs text-slate-400 mb-2">{formatearFecha(respuesta.fechaRespuesta)}</p>
                  <pre className="text-sm text-[#1f2421] whitespace-pre-wrap">
                    {JSON.stringify(respuesta.respuestas, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};