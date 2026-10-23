import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Inbox,
  AlertCircle,
  MessageSquare,
  GitBranch,
  Download,
} from 'lucide-react';
import {
  obtenerEncuesta,
  obtenerRespuestasRecibidas,
  obtenerVersionesEnServidor,
  type RespuestaRecibida,
} from '../services/encuestasService';
import { exportarRespuestasAExcel } from '../services/exportarRespuestas';
import { Encuesta, Pregunta, ValorRespuesta, VersionHistorial } from '../db/schema';
import { esInformativa, esMatriz, rangoEscala, TIPOS_ESCALA, TIPOS_TEXTO } from '../services/tiposPregunta';

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function valorLegible(v: ValorRespuesta | undefined): string {
  if (v === undefined || v === null || v === '') return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') {
    return Object.entries(v)
      .map(([k, val]) => `${k}: ${val}`)
      .join(' · ');
  }
  return String(v);
}

const lista = (v: ValorRespuesta | undefined): string[] => {
  if (Array.isArray(v)) return v.map(String);
  if (v === undefined || v === null || v === '') return [];
  return [String(v)];
};

// Una pregunta compuesta (matriz, doble eje, varios renglones) se guarda con
// una clave por fila o por ítem: `${pregunta.id}-${fila}`. Acá se aplana a
// líneas legibles para la vista de detalle.
function subRespuestas(
  respuesta: RespuestaRecibida,
  pregunta: Pregunta
): Array<{ etiqueta: string; valor: string }> {
  const clave = (sufijo: string) => `${pregunta.id}-${sufijo}`;

  if (pregunta.tipo === 'matriz_doble_eje') {
    return (pregunta.opciones ?? []).flatMap((fila) =>
      (['izq', 'der'] as const).map((lado) => ({
        etiqueta: `${fila} · ${lado === 'izq' ? pregunta.ejeIzquierdo ?? 'Izquierda' : pregunta.ejeDerecho ?? 'Derecha'}`,
        valor: valorLegible(respuesta.respuestas[clave(`${fila}-${lado}`)]),
      }))
    );
  }

  if (pregunta.tipo === 'matriz_columnas') {
    return (pregunta.columnas ?? []).map((columna) => ({
      etiqueta: columna,
      valor: valorLegible(respuesta.respuestas[clave(columna)]),
    }));
  }

  if (esMatriz(pregunta.tipo)) {
    return (pregunta.opciones ?? []).map((fila) => ({
      etiqueta: fila,
      valor: valorLegible(respuesta.respuestas[clave(fila)]),
    }));
  }

  if (pregunta.tipo === 'textos_multiples' || pregunta.tipo === 'numero_multiple') {
    return (pregunta.opciones ?? []).map((fila) => ({
      etiqueta: fila,
      valor: valorLegible(respuesta.respuestas[clave(fila)]),
    }));
  }

  const comentarios: Array<{ etiqueta: string; valor: string }> = [];

  if (pregunta.tipo === 'opcion_unica_comentario') {
    comentarios.push({
      etiqueta: 'Comentario',
      valor: valorLegible(respuesta.respuestas[clave('comentario')]),
    });
  }

  if (pregunta.tipo === 'opcion_multiple_comentario') {
    const prefijo = clave('comentario-');
    for (const [k, v] of Object.entries(respuesta.respuestas)) {
      if (k.startsWith(prefijo)) comentarios.push({ etiqueta: k.slice(prefijo.length), valor: valorLegible(v) });
    }
  }

  return comentarios;
}

function valoresPrincipales(respuesta: RespuestaRecibida, pregunta: Pregunta): string[] {
  return lista(respuesta.respuestas[pregunta.id]);
}

interface Resumen {
  pregunta: Pregunta;
  promedio?: { valor: number; max: number };
  conteo?: Array<{ etiqueta: string; cantidad: number }>;
  filas?: Array<{ fila: string; promedio: number; max: number; total: number }>;
}

function numerosDe(respuestas: RespuestaRecibida[], clave: string): number[] {
  return respuestas
    .map((r) => r.respuestas[clave])
    .filter((v) => v !== undefined && v !== '' && v !== null)
    .map((v) => (typeof v === 'number' ? v : Number(String(v))))
    .filter((n) => Number.isFinite(n));
}

function promedioDe(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100;
}

function contar(todos: string[], opciones: string[]): Array<{ etiqueta: string; cantidad: number }> {
  return opciones.map((opcion) => ({
    etiqueta: opcion,
    cantidad: todos.filter((t) => t === opcion).length,
  }));
}

function calcularResumen(preguntas: Pregunta[], respuestas: RespuestaRecibida[]): Resumen[] {
  const resumenes: Resumen[] = [];

  for (const pregunta of preguntas) {
    if (esInformativa(pregunta.tipo)) continue;

    const opciones = pregunta.opciones ?? [];
    const claveFila = (fila: string) => `${pregunta.id}-${fila}`;

    // Escalas y números sueltos: promedio directo.
    if (TIPOS_ESCALA.includes(pregunta.tipo) || pregunta.tipo === 'numero') {
      const { max } = rangoEscala(pregunta);
      const promedio = promedioDe(numerosDe(respuestas, pregunta.id));
      if (promedio === null) continue;
      resumenes.push({ pregunta, promedio: { valor: promedio, max } });
      continue;
    }

    // Matrices numéricas: promedio por fila.
    if (pregunta.tipo === 'matriz_escala' || pregunta.tipo === 'matriz_numero') {
      const { max } = rangoEscala(pregunta);
      const filas = opciones.map((fila) => {
        const valores = numerosDe(respuestas, claveFila(fila));
        return { fila, promedio: promedioDe(valores) ?? 0, max, total: valores.length };
      });
      if (filas.length === 0) continue;
      resumenes.push({ pregunta, filas });
      continue;
    }

    // Matrices de etiquetas: distribución de lo elegido en cada celda.
    if (esMatriz(pregunta.tipo)) {
      if (pregunta.tipo === 'matriz_doble_eje') {
        const izq = pregunta.ejeIzquierdo ?? 'Izquierda';
        const der = pregunta.ejeDerecho ?? 'Derecha';
        const todos = respuestas.flatMap((r) =>
          opciones.flatMap((fila) =>
            (['izq', 'der'] as const).map((lado) => {
              const etiqueta = lado === 'izq' ? izq : der;
              const v = valorLegible(r.respuestas[claveFila(`${fila}-${lado}`)]);
              return v ? `${etiqueta}: ${v}` : '';
            })
          )
        );
        const conteo = [...new Set(todos.filter(Boolean))]
          .map((etiqueta) => ({ etiqueta, cantidad: todos.filter((t) => t === etiqueta).length }))
          .sort((a, b) => b.cantidad - a.cantidad);
        if (conteo.length > 0) resumenes.push({ pregunta, conteo });
        continue;
      }

      if (pregunta.tipo === 'matriz_columnas') {
        const todos = respuestas.flatMap((r) =>
          (pregunta.columnas ?? []).map((columna) => valorLegible(r.respuestas[claveFila(columna)]))
        );
        const conteo = [...new Set(todos.filter(Boolean))]
          .map((etiqueta) => ({ etiqueta, cantidad: todos.filter((t) => t === etiqueta).length }))
          .sort((a, b) => b.cantidad - a.cantidad);
        if (conteo.length > 0) resumenes.push({ pregunta, conteo });
        continue;
      }

      const todos = respuestas.flatMap((r) =>
        opciones.map((fila) => valorLegible(r.respuestas[claveFila(fila)]))
      );
      const conteo = [...new Set(todos.filter(Boolean))]
        .map((etiqueta) => ({ etiqueta, cantidad: todos.filter((t) => t === etiqueta).length }))
        .sort((a, b) => b.cantidad - a.cantidad);
      if (conteo.length > 0) resumenes.push({ pregunta, conteo });
      continue;
    }

    // Listas, desplegables, opción múltiple y ranking: conteo por opción.
    if (opciones.length > 0 || ['idioma', 'genero', 'si_no', 'ranking'].includes(pregunta.tipo)) {
      const todos = respuestas.flatMap((r) => valoresPrincipales(r, pregunta));
      const conteo = contar(
        todos,
        opciones.length > 0 ? opciones : [...new Set(todos)].sort()
      );
      resumenes.push({ pregunta, conteo });
      continue;
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
    .filter((p) => TIPOS_TEXTO.includes(p.tipo) && p.tipo !== 'matriz_texto')
    .filter((p) => respuestas.some((r) => valorLegible(r.respuestas[p.id]).trim().length > 0));

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
                    <span className="text-2xl font-semibold text-[#008751]">{promedio.valor}</span>
                    <span className="text-sm text-slate-500">de {promedio.max} en promedio</span>
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
                    {filas.map(({ fila, promedio: prom, max, total }) => (
                      <div key={fila} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{fila}</span>
                        <span className="text-slate-500">
                          {total > 0 ? `${prom} de ${max} (${total})` : '—'}
                        </span>
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
              {version.preguntas
                .filter((pregunta) => !esInformativa(pregunta.tipo))
                .map((pregunta) => {
                  const principal = valorLegible(respuesta.respuestas[pregunta.id]);
                  const subs = subRespuestas(respuesta, pregunta).filter((s) => s.valor);

                  if (!principal && subs.length === 0) {
                    return (
                      <div key={pregunta.id} className="flex gap-2 text-sm">
                        <span className="text-slate-500">{pregunta.texto}</span>
                        <span className="text-slate-300">Sin responder</span>
                      </div>
                    );
                  }

                  return (
                    <div key={pregunta.id} className="text-sm">
                      <div className="flex gap-2">
                        <span className="text-slate-500">{pregunta.texto}</span>
                        {principal && (
                          <span className="text-[#1f2421] font-medium">{principal}</span>
                        )}
                      </div>
                      {subs.length > 0 && (
                        <ul className="mt-1 pl-4 border-l-2 border-slate-100">
                          {subs.map((s) => (
                            <li key={s.etiqueta} className="text-slate-600">
                              <span className="text-slate-400">{s.etiqueta}: </span>
                              {s.valor}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
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
  const [exportando, setExportando] = useState(false);

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

  const exportar = () => {
    if (!encuesta) return;
    setExportando(true);
    try {
      if (!exportarRespuestasAExcel(encuesta, versiones ?? [], respuestas)) {
        setError('Todavía no hay respuestas para exportar.');
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el archivo de Excel.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/home/encuestas')}
        className="flex items-center gap-1 text-slate-500 hover:text-[#1f2421] mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1f2421] mb-1">Respuestas</h1>
          <p className="text-slate-500">
            {encuesta.titulo} — {total} respuesta{total === 1 ? '' : 's'} recibida
            {total === 1 ? '' : 's'}
            {versionActiva && total > 0 && (
              <span className="text-slate-400"> · versión activa v{versionActiva.numero}</span>
            )}
          </p>
        </div>

        <button
          onClick={exportar}
          disabled={total === 0 || exportando}
          className="inline-flex items-center gap-2 bg-[#008751] hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded px-4 py-2 text-sm font-medium shrink-0"
          title="Descarga un archivo .xlsx con una hoja por versión"
        >
          <Download className="w-4 h-4" />
          {exportando ? 'Exportando…' : 'Exportar a Excel'}
        </button>
      </div>

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
            Cuando alguien responda el enlace compartido, aparecerá aquí.
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