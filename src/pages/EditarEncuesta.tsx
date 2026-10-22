import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  GitBranch,
} from 'lucide-react';
import { FormatoNumero, Pregunta, Seccion, TipoPregunta } from '../db/schema';
import { obtenerEncuesta, guardarEncuestaCompleta } from '../services/encuestasService';
import { SeccionesEditor } from '../components/SeccionesEditor';
import { agruparPorSeccion, moverEnSuGrupo, seccionesValidas } from '../services/secciones';
import {
  FORMATOS_NUMERO,
  GRUPOS_TIPOS,
  crearPreguntaPorTipo,
  defDeTipo,
  esInformativa,
  etiquetaTipo,
  esMatriz,
  rangoEscala,
  TIPOS_MATRIZ_REQUIEREN_COLUMNAS,
  usaColumnas,
  usaOpciones,
} from '../services/tiposPregunta';

const TIPOS_OPCIONES_PLACEHOLDER: Partial<Record<TipoPregunta, string>> = {
  desplegable: 'Opción',
  opcion_unica: 'Opción',
  genero: 'Opción',
  si_no: 'Opción',
  idioma: 'Idioma',
  ranking: 'Elemento',
  textos_multiples: 'Renglón',
  numero_multiple: 'Renglón',
};

function placeholderOpciones(tipo: TipoPregunta): string {
  if (esMatriz(tipo)) return 'Fila';
  return TIPOS_OPCIONES_PLACEHOLDER[tipo] ?? 'Opción';
}

function nuevaPregunta(tipo: TipoPregunta = 'texto'): Pregunta {
  return crearPreguntaPorTipo(tipo);
}

interface EditorListaProps {
  etiqueta: string;
  valores: string[];
  placeholder: string;
  onCambiar: (valores: string[]) => void;
}

/** Editor de una lista de cadenas (opciones, filas o columnas). */
const EditorLista: React.FC<EditorListaProps> = ({ etiqueta, valores, placeholder, onCambiar }) => (
  <div>
    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{etiqueta}</p>
    {valores.map((valor, i) => (
      <div key={i} className="flex items-center gap-2 mb-1">
        <input
          value={valor}
          onChange={(e) => onCambiar(valores.map((v, j) => (j === i ? e.target.value : v)))}
          placeholder={`${placeholder} ${i + 1}`}
          className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
        />
        <button
          onClick={() => onCambiar(valores.filter((_, j) => j !== i))}
          className="text-slate-300 hover:text-red-500 shrink-0"
          title={`Eliminar ${placeholder.toLowerCase()}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ))}
    <button
      onClick={() => onCambiar([...valores, ''])}
      className="text-sm text-[#008751] font-medium hover:underline mt-1"
    >
      + Agregar {placeholder.toLowerCase()}
    </button>
  </div>
);

const campoCls =
  'border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30';

const etiquetaCls = 'text-xs font-medium text-slate-500 uppercase tracking-wide';

export const EditarEncuesta: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const esNueva = !id || id === 'nueva';

  const [existente, setExistente] = useState<{
    id: string;
    versionId?: string;
    versionNumero?: number;
    sellada?: boolean;
  } | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [cargando, setCargando] = useState(esNueva ? false : true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (esNueva) return;
    (async () => {
      const encuesta = await obtenerEncuesta(id!);
      if (!encuesta) {
        setError('Encuesta no encontrada en este dispositivo.');
        setCargando(false);
        return;
      }
      setExistente({
        id: encuesta.id,
        versionId: encuesta.versionId,
        versionNumero: encuesta.versionNumero,
        sellada: encuesta.sellada,
      });
      setTitulo(encuesta.titulo);
      setDescripcion(encuesta.descripcion ?? '');
      setPreguntas(encuesta.preguntas.map((p) => ({ ...p })));
      setSecciones(seccionesValidas(encuesta.secciones));
      setCargando(false);
    })();
  }, [id, esNueva]);

  const cambiarPregunta = (pid: string, cambios: Partial<Pregunta>) => {
    setPreguntas((prev) => prev.map((p) => (p.id === pid ? { ...p, ...cambios } : p)));
  };

  // Mete o saca una pregunta de una sección. Sin sección = undefined.
  const asignarPregunta = (pid: string, seccionId: string | undefined) => {
    setPreguntas((prev) =>
      prev.map((p) => {
        if (p.id !== pid) return p;
        if (seccionId) return { ...p, seccionId };
        const { seccionId: _fuera, ...resto } = p;
        return resto;
      })
    );
  };

  // Las preguntas se muestran agrupadas por sección; dentro de cada grupo
  // conservan el orden en que están en el arreglo.
  const grupos = useMemo(() => agruparPorSeccion(preguntas, secciones), [preguntas, secciones]);

  // Número con el que se ve cada pregunta: su lugar en el orden mostrado
  // (secciones primero, y dentro de cada una el orden del arreglo).
  const indiceDe = useMemo(() => {
    const mapa = new Map<string, number>();
    let n = 0;
    for (const grupo of grupos) {
      for (const p of grupo.preguntas) mapa.set(p.id, n++);
    }
    return mapa;
  }, [grupos]);

  // Si la pregunta puede subir o bajar dentro de su grupo.
  const limites = useMemo(() => {
    const mapa = new Map<string, { arriba: boolean; abajo: boolean }>();
    for (const grupo of grupos) {
      grupo.preguntas.forEach((p, i) => {
        mapa.set(p.id, { arriba: i > 0, abajo: i < grupo.preguntas.length - 1 });
      });
    }
    return mapa;
  }, [grupos]);

  // Cambiar de tipo conserva el texto y reaplica los valores por defecto del
  // catálogo, para no dejar campos huérfanos del tipo anterior.
  const cambiarTipo = (pid: string, tipo: TipoPregunta) => {
    setPreguntas((prev) =>
      prev.map((p) => {
        if (p.id !== pid) return p;
        const base = crearPreguntaPorTipo(tipo, p.id);
        base.texto = p.texto;
        if (p.seccionId) base.seccionId = p.seccionId;
        return base;
      })
    );
  };

  const agregarPregunta = (tipo: TipoPregunta) => {
    setPreguntas((prev) => {
      const nueva = nuevaPregunta(tipo);
      // Si ya hay secciones, la pregunta nueva entra en la última: así el
      // autor va llenando el tramo que está armando.
      const ultima = secciones[secciones.length - 1];
      if (ultima) nueva.seccionId = ultima.id;
      return [...prev, nueva];
    });
    setError(null);
  };

  // Sube o baja la pregunta dentro de su propio grupo (sección).
  const moverPregunta = (preguntaId: string, dir: -1 | 1) => {
    setPreguntas((prev) => moverEnSuGrupo(prev, preguntaId, dir));
  };

  function validarPregunta(p: Pregunta, indice: number): string | null {
    const n = indice + 1;
    const nombre = etiquetaTipo(p.tipo);
    if (!p.texto.trim()) {
      return esInformativa(p.tipo)
        ? `El bloque de texto ${n} no tiene contenido.`
        : `La pregunta ${n} no tiene texto.`;
    }
    const conOpciones = (p.opciones ?? []).filter((o) => o.trim());
    if (usaOpciones(p.tipo) && conOpciones.length === 0) {
      return `La pregunta ${n} (${nombre}) necesita al menos una opción.`;
    }
    if (TIPOS_MATRIZ_REQUIEREN_COLUMNAS.includes(p.tipo) && (p.columnas ?? []).filter((c) => c.trim()).length === 0) {
      return `La pregunta ${n} (${nombre}) necesita al menos una columna.`;
    }
    if (usaOpciones(p.tipo)) {
      const repetidas = conOpciones.filter(
        (o, i) => conOpciones.findIndex((x) => x.toLowerCase() === o.toLowerCase()) !== i
      );
      if (repetidas.length > 0) {
        return `La pregunta ${n} (${nombre}) tiene opciones repetidas: ${repetidas.join(', ')}.`;
      }
    }
    if (p.tipo === 'escala_n' || p.tipo === 'matriz_escala') {
      const { min, max } = rangoEscala(p);
      if (max <= min) {
        return `La pregunta ${n} (${nombre}) necesita un máximo mayor que el mínimo.`;
      }
    }
    return null;
  }

  const validarLocal = (): string | null => {
    if (!titulo.trim()) return 'Escribe un título.';
    if (preguntas.length === 0) return 'Agrega al menos una pregunta.';
    for (const [i, seccion] of secciones.entries()) {
      if (!seccion.titulo.trim()) return `La sección ${i + 1} necesita un título.`;
    }
    for (let i = 0; i < preguntas.length; i++) {
      const error = validarPregunta(preguntas[i], i);
      if (error) return error;
    }
    return null;
  };

  const handleGuardar = async () => {
    const invalido = validarLocal();
    if (invalido) {
      setError(invalido);
      return;
    }

    setGuardando(true);
    setError(null);

    const limpiar = (valores?: string[]) =>
      valores?.map((v) => v.trim()).filter(Boolean);

    const idsSeccion = new Set(secciones.map((s) => s.id));

    const draft = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      preguntas: preguntas.map((p) => ({
        ...p,
        texto: p.texto.trim(),
        // Una pregunta que apunta a una sección borrada se queda sin sección.
        seccionId: p.seccionId && idsSeccion.has(p.seccionId) ? p.seccionId : undefined,
        opciones: limpiar(p.opciones),
        columnas: limpiar(p.columnas),
      })),
      secciones: secciones.map((s) => ({
        id: s.id,
        titulo: s.titulo.trim(),
        descripcion: s.descripcion?.trim() || undefined,
      })),
    };

    try {
      let destino: string;
      if (esNueva) {
        const guardada = await guardarEncuestaCompleta(draft, undefined);
        destino = `/home/encuestas/${guardada.id}`;
      } else {
        await guardarEncuestaCompleta(draft, existente!);
        destino = '/home/encuestas';
      }
      navigate(destino);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la encuesta.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <p className="text-slate-500">Cargando encuesta...</p>;
  }

  const hacerFork = !esNueva && existente?.sellada === true;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/home/encuestas')}
        className="flex items-center gap-1 text-slate-500 hover:text-[#1f2421] mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <h1 className="text-2xl font-semibold text-[#1f2421] mb-1">
        {esNueva ? 'Crear encuesta' : 'Editar encuesta'}
      </h1>
      <p className="text-slate-500 mb-6">
        {esNueva
          ? 'Diseña la encuesta desde aquí, sin Word'
          : `Versión activa v${existente?.versionNumero ?? '?'} · ${
              hacerFork ? 'sellada (ya tiene respuestas)' : 'sin respuestas aún'
            }`}
      </p>

      {hacerFork && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-4 py-3 mb-6 text-sm">
          <GitBranch className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-1">Esta versión ya tiene respuestas y quedó sellada.</p>
            <p>
              Al guardar se creará una <b>versión nueva</b> (v{existente!.versionNumero! + 1}). Las
              respuestas de la versión anterior quedan intactas y ligadas a sus preguntas.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm mb-6">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md p-6 mb-6">
        <label className="block font-medium text-[#1f2421] mb-1">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej. Satisfacción del servicio eléctrico"
          className="w-full border border-slate-300 rounded px-3 py-2 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#008751]"
        />

        <label className="block font-medium text-[#1f2421] mb-1 mt-4">
          Descripción <span className="text-xs text-slate-400 font-normal">(opcional)</span>
        </label>
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ayúdanos a mejorar tu experiencia"
          className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008751]"
        />
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-[#1f2421]">
            Preguntas <span className="text-slate-400 font-normal">({preguntas.length})</span>
          </h2>
        </div>

        <SeccionesEditor
          secciones={secciones}
          preguntas={preguntas}
          onCambiarSecciones={setSecciones}
          onAsignarPregunta={asignarPregunta}
        />

        <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
          <p className={`${etiquetaCls} mb-2`}>Agregar pregunta</p>

          <p className="text-xs text-slate-500 mb-1">
            Máscaras predefinidas (ya vienen con su contenido, sólo edita el texto):
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {GRUPOS_TIPOS.find((g) => g.id === 'predefinidas')!.tipos.map((def) => (
              <button
                key={def.tipo}
                onClick={() => agregarPregunta(def.tipo)}
                title={def.descripcion}
                className="flex items-center gap-1 border border-slate-300 bg-white hover:border-[#008751] hover:text-[#008751] rounded px-3 py-1.5 text-sm text-slate-600"
              >
                <Plus className="w-3.5 h-3.5" /> {def.etiqueta}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            {GRUPOS_TIPOS.filter((g) => g.id !== 'predefinidas').map((grupo) => (
              <div key={grupo.id} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-32 shrink-0">{grupo.etiqueta}</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) agregarPregunta(e.target.value as TipoPregunta);
                  }}
                  className={`flex-1 ${campoCls}`}
                >
                  <option value="">Agregar…</option>
                  {grupo.tipos.map((def) => (
                    <option key={def.tipo} value={def.tipo}>
                      {def.etiqueta} — {def.descripcion}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {preguntas.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500 text-sm">
            Todavía no hay preguntas. Agrega la primera.
          </div>
        )}

        {grupos.map((grupo) => (
          <div key={grupo.seccion?.id ?? 'sin-seccion'} className="flex flex-col gap-3">
            {grupo.seccion && (
              <div className="flex items-center gap-2 mt-2">
                <span className="w-1.5 h-6 rounded bg-[#008751]" />
                <div>
                  <p className="font-medium text-[#1f2421]">{grupo.seccion.titulo}</p>
                  {grupo.seccion.descripcion && (
                    <p className="text-sm text-slate-500">{grupo.seccion.descripcion}</p>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  ({grupo.preguntas.length} pregunta{grupo.preguntas.length === 1 ? '' : 's'})
                </span>
              </div>
            )}

            {grupo.preguntas.map((pregunta) => {
              const def = defDeTipo(pregunta.tipo);
              const conOpciones = usaOpciones(pregunta.tipo);
              const conColumnas = usaColumnas(pregunta.tipo);
              const matriz = esMatriz(pregunta.tipo);
              const i = indiceDe.get(pregunta.id) ?? 0;

              return (
            <div key={pregunta.id} className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <span className="text-sm font-semibold text-slate-400 mt-2">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <input
                    value={pregunta.texto}
                    onChange={(e) => cambiarPregunta(pregunta.id, { texto: e.target.value })}
                    placeholder={
                      esInformativa(pregunta.tipo)
                        ? 'Escribe el texto que se mostrará...'
                        : 'Escribe la pregunta...'
                    }
                    className="w-full border border-transparent focus:border-slate-300 rounded px-2 py-1 -mx-2 font-medium text-[#1f2421] focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                  />

                  <select
                    value={pregunta.tipo}
                    onChange={(e) => cambiarTipo(pregunta.id, e.target.value as TipoPregunta)}
                    className="mt-2 border border-slate-300 rounded px-2 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                  >
                    {GRUPOS_TIPOS.map((grupoTipos) => (
                      <optgroup key={grupoTipos.id} label={grupoTipos.etiqueta}>
                        {grupoTipos.tipos.map((t) => (
                          <option key={t.tipo} value={t.tipo}>
                            {t.etiqueta}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-400">{def.descripcion}</p>

                  {secciones.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`${etiquetaCls} shrink-0`}>Sección</span>
                      <select
                        value={pregunta.seccionId ?? ''}
                        onChange={(e) =>
                          asignarPregunta(pregunta.id, e.target.value || undefined)
                        }
                        className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                      >
                        <option value="">Sin sección</option>
                        {secciones.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.titulo || 'Sección sin título'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!esInformativa(pregunta.tipo) && (
                    <label className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={pregunta.obligatorio ?? false}
                        onChange={(e) => cambiarPregunta(pregunta.id, { obligatorio: e.target.checked })}
                      />
                      Respuesta obligatoria
                    </label>
                  )}

                  <div className="mt-3 flex flex-col gap-4">
                    {conOpciones && (
                      <EditorLista
                        etiqueta={
                          matriz && usaColumnas(pregunta.tipo) ? 'Opciones (comunes)' : matriz ? 'Filas' : 'Opciones'
                        }
                        valores={pregunta.opciones ?? []}
                        placeholder={placeholderOpciones(pregunta.tipo)}
                        onCambiar={(opciones) => cambiarPregunta(pregunta.id, { opciones })}
                      />
                    )}

                    {conColumnas && (
                      <EditorLista
                        etiqueta={pregunta.tipo === 'matriz_columnas' ? 'Columnas a calificar' : 'Columnas'}
                        valores={pregunta.columnas ?? []}
                        placeholder="Columna"
                        onCambiar={(columnas) => cambiarPregunta(pregunta.id, { columnas })}
                      />
                    )}

                    {(pregunta.tipo === 'escala' || pregunta.tipo === 'escala_n') && (
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Mínimo</p>
                          <input
                            type="number"
                            value={pregunta.minimo ?? 1}
                            onChange={(e) =>
                              cambiarPregunta(pregunta.id, { minimo: Number(e.target.value) })
                            }
                            className={`${campoCls} w-24`}
                          />
                        </div>
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Máximo</p>
                          <input
                            type="number"
                            value={pregunta.maximo ?? 5}
                            onChange={(e) =>
                              cambiarPregunta(pregunta.id, { maximo: Number(e.target.value) })
                            }
                            className={`${campoCls} w-24`}
                          />
                        </div>
                        <p className="text-xs text-slate-400 pb-2">
                          Se responde de {rangoEscala(pregunta).min} a {rangoEscala(pregunta).max}
                        </p>
                      </div>
                    )}

                    {pregunta.tipo === 'numero' && (
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Tipo de respuesta</p>
                          <select
                            value={pregunta.formato ?? 'entero'}
                            onChange={(e) =>
                              cambiarPregunta(pregunta.id, { formato: e.target.value as FormatoNumero })
                            }
                            className={campoCls}
                          >
                            {FORMATOS_NUMERO.map((f) => (
                              <option key={f.valor} value={f.valor}>
                                {f.etiqueta}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Mínimo</p>
                          <input
                            type="number"
                            value={pregunta.minimo ?? ''}
                            onChange={(e) =>
                              cambiarPregunta(pregunta.id, {
                                minimo: e.target.value === '' ? undefined : Number(e.target.value),
                              })
                            }
                            placeholder="Sin mínimo"
                            className={`${campoCls} w-28`}
                          />
                        </div>
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Máximo</p>
                          <input
                            type="number"
                            value={pregunta.maximo ?? ''}
                            onChange={(e) =>
                              cambiarPregunta(pregunta.id, {
                                maximo: e.target.value === '' ? undefined : Number(e.target.value),
                              })
                            }
                            placeholder="Sin máximo"
                            className={`${campoCls} w-28`}
                          />
                        </div>
                      </div>
                    )}

                    {pregunta.tipo === 'matriz_numero' && (
                      <div>
                        <p className={`${etiquetaCls} mb-1`}>Tipo de respuesta</p>
                        <select
                          value={pregunta.formato ?? 'entero'}
                          onChange={(e) =>
                            cambiarPregunta(pregunta.id, { formato: e.target.value as FormatoNumero })
                          }
                          className={campoCls}
                        >
                          {FORMATOS_NUMERO.map((f) => (
                            <option key={f.valor} value={f.valor}>
                              {f.etiqueta}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {pregunta.tipo === 'matriz_doble_eje' && (
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Extremo izquierdo</p>
                          <input
                            value={pregunta.ejeIzquierdo ?? ''}
                            onChange={(e) => cambiarPregunta(pregunta.id, { ejeIzquierdo: e.target.value })}
                            className={`${campoCls} w-40`}
                          />
                        </div>
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Extremo derecho</p>
                          <input
                            value={pregunta.ejeDerecho ?? ''}
                            onChange={(e) => cambiarPregunta(pregunta.id, { ejeDerecho: e.target.value })}
                            className={`${campoCls} w-40`}
                          />
                        </div>
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Puntos</p>
                          <input
                            type="number"
                            min={2}
                            value={pregunta.puntos ?? 5}
                            onChange={(e) => cambiarPregunta(pregunta.id, { puntos: Number(e.target.value) })}
                            className={`${campoCls} w-20`}
                          />
                        </div>
                      </div>
                    )}

                    {pregunta.tipo === 'ranking' && (
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Extremo izquierdo</p>
                          <input
                            value={pregunta.ejeIzquierdo ?? ''}
                            onChange={(e) => cambiarPregunta(pregunta.id, { ejeIzquierdo: e.target.value })}
                            className={`${campoCls} w-40`}
                          />
                        </div>
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Extremo derecho</p>
                          <input
                            value={pregunta.ejeDerecho ?? ''}
                            onChange={(e) => cambiarPregunta(pregunta.id, { ejeDerecho: e.target.value })}
                            className={`${campoCls} w-40`}
                          />
                        </div>
                      </div>
                    )}

                    {(pregunta.tipo === 'opcion_multiple' ||
                      pregunta.tipo === 'opcion_multiple_comentario') && (
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={pregunta.otro ?? false}
                          onChange={(e) => cambiarPregunta(pregunta.id, { otro: e.target.checked })}
                        />
                        Incluir opción libre “Otro”
                      </label>
                    )}

                    {pregunta.tipo === 'archivo' && (
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[220px]">
                          <p className={`${etiquetaCls} mb-1`}>Extensiones permitidas</p>
                          <input
                            value={(pregunta.extensiones ?? []).join(', ')}
                            onChange={(e) =>
                              cambiarPregunta(pregunta.id, {
                                extensiones: e.target.value
                                  .split(',')
                                  .map((x) => x.trim().replace(/^\./, ''))
                                  .filter(Boolean),
                              })
                            }
                            placeholder="pdf, jpg, png"
                            className={`${campoCls} w-full`}
                          />
                        </div>
                        <div>
                          <p className={`${etiquetaCls} mb-1`}>Máximo (MB)</p>
                          <input
                            type="number"
                            min={1}
                            value={pregunta.tamanoMaximo ?? 10}
                            onChange={(e) =>
                              cambiarPregunta(pregunta.id, { tamanoMaximo: Number(e.target.value) })
                            }
                            className={`${campoCls} w-24`}
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-600 pb-2">
                          <input
                            type="checkbox"
                            checked={pregunta.variosArchivos ?? false}
                            onChange={(e) =>
                              cambiarPregunta(pregunta.id, { variosArchivos: e.target.checked })
                            }
                          />
                          Varios archivos
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0 mt-1">
                  <button
                    onClick={() => moverPregunta(pregunta.id, -1)}
                    disabled={!limites.get(pregunta.id)?.arriba}
                    className="text-slate-300 hover:text-[#1f2421] disabled:opacity-30"
                    title="Subir pregunta"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moverPregunta(pregunta.id, 1)}
                    disabled={!limites.get(pregunta.id)?.abajo}
                    className="text-slate-300 hover:text-[#1f2421] disabled:opacity-30"
                    title="Bajar pregunta"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setPreguntas((prev) => prev.filter((p) => p.id !== pregunta.id))}
                  className="text-slate-300 hover:text-red-500 shrink-0 mt-1"
                  title="Eliminar pregunta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="flex items-center gap-2 bg-[#008751] hover:bg-green-700 disabled:opacity-60 text-white rounded px-5 py-2 font-medium"
        >
          {hacerFork ? <GitBranch className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {guardando
            ? 'Guardando...'
            : hacerFork
              ? `Guardar como v${(existente?.versionNumero ?? 1) + 1}`
              : 'Guardar encuesta'}
        </button>
        <button
          onClick={() => navigate('/home/encuestas')}
          className="px-4 py-2 text-sm rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
