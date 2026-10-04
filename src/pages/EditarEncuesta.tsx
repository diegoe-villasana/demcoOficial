import React, { useEffect, useState } from 'react';
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
import { Pregunta } from '../db/schema';
import {
  obtenerEncuesta,
  guardarEncuestaCompleta,
} from '../services/encuestasService';

const ETIQUETAS_TIPO: Record<Pregunta['tipo'], string> = {
  texto: 'Abierta',
  opcion_multiple: 'Múltiple',
  escala: 'Escala',
  matriz: 'Matriz',
};

const COLUMNAS_MATRIZ_DEFAULT = [
  'Muy en desacuerdo',
  'En desacuerdo',
  'Neutral',
  'De acuerdo',
  'Muy de acuerdo',
];

function nuevaPregunta(tipo: Pregunta['tipo'] = 'texto'): Pregunta {
  return {
    id: crypto.randomUUID(),
    texto: '',
    tipo,
    ...(tipo === 'opcion_multiple' ? { opciones: [''] } : {}),
    ...(tipo === 'matriz' ? { opciones: [''], columnas: [...COLUMNAS_MATRIZ_DEFAULT] } : {}),
  };
}

export const EditarEncuesta: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const esNueva = !id || id === 'nueva';

  // Datos en el servidor (si es edición): deciden si el guardado edita en
  // sitio o hace fork.
  const [existente, setExistente] = useState<{
    id: string;
    versionId?: string;
    versionNumero?: number;
    sellada?: boolean;
  } | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
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
      setCargando(false);
    })();
  }, [id, esNueva]);

  const cambiarPregunta = (pid: string, cambios: Partial<Pregunta>) => {
    setPreguntas((prev) => prev.map((p) => (p.id === pid ? { ...p, ...cambios } : p)));
  };

  const cambiarTipo = (pid: string, tipo: Pregunta['tipo']) => {
    setPreguntas((prev) =>
      prev.map((p) => {
        if (p.id !== pid) return p;
        const base: Pregunta = { id: p.id, texto: p.texto, tipo };
        if (tipo === 'opcion_multiple') base.opciones = p.opciones?.length ? p.opciones : [''];
        if (tipo === 'matriz') {
          base.opciones = p.opciones?.length ? p.opciones : [''];
          base.columnas = p.columnas?.length ? p.columnas : [...COLUMNAS_MATRIZ_DEFAULT];
        }
        return base;
      })
    );
  };

  const actualizarOpcion = (pid: string, i: number, valor: string) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === pid ? { ...p, opciones: (p.opciones ?? []).map((o, j) => (j === i ? valor : o)) } : p
      )
    );
  };

  const actualizarColumna = (pid: string, i: number, valor: string) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === pid
          ? { ...p, columnas: (p.columnas ?? []).map((o, j) => (j === i ? valor : o)) }
          : p
      )
    );
  };

  const agregarOpcion = (pid: string) => {
    setPreguntas((prev) => prev.map((p) => (p.id === pid ? { ...p, opciones: [...(p.opciones ?? []), ''] } : p)));
  };

  const eliminarOpcion = (pid: string, i: number) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === pid ? { ...p, opciones: (p.opciones ?? []).filter((_, j) => j !== i) } : p
      )
    );
  };

  const agregarColumna = (pid: string) => {
    setPreguntas((prev) => prev.map((p) => (p.id === pid ? { ...p, columnas: [...(p.columnas ?? []), ''] } : p)));
  };

  const eliminarColumna = (pid: string, i: number) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === pid ? { ...p, columnas: (p.columnas ?? []).filter((_, j) => j !== i) } : p
      )
    );
  };

  const moverPregunta = (i: number, dir: -1 | 1) => {
    setPreguntas((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  };

  const validarLocal = (): string | null => {
    if (!titulo.trim()) return 'Escribe un título.';
    if (preguntas.length === 0) return 'Agrega al menos una pregunta.';
    for (let i = 0; i < preguntas.length; i++) {
      const p = preguntas[i];
      if (!p.texto.trim()) return `La pregunta ${i + 1} no tiene texto.`;
      if (p.tipo === 'opcion_multiple' && (p.opciones ?? []).filter((o) => o.trim()).length === 0) {
        return `La pregunta ${i + 1} (Múltiple) necesita opciones.`;
      }
      if (p.tipo === 'matriz' && (p.opciones ?? []).filter((o) => o.trim()).length === 0) {
        return `La pregunta ${i + 1} (Matriz) necesita filas.`;
      }
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

    const draft = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      preguntas: preguntas.map((p) => ({
        ...p,
        texto: p.texto.trim(),
        opciones: p.opciones?.filter((o) => o.trim()).map((o) => o.trim()),
        columnas: p.columnas?.filter((o) => o.trim()).map((o) => o.trim()),
      })),
    };

    try {
      let destino: string;
      if (esNueva) {
        // Encuesta nueva: guardarEncuestaCompleta hace POST / crea v1 y
        // refresca el caché local con el id que devolvió el servidor.
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

  const hacerFork = !esNueva && (existente?.sellada === true);

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
          <button
            onClick={() => setPreguntas((prev) => [...prev, nuevaPregunta('texto')])}
            className="flex items-center gap-1 text-sm text-[#008751] font-medium hover:underline"
          >
            <Plus className="w-4 h-4" /> Agregar pregunta
          </button>
        </div>

        {preguntas.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-slate-500 text-sm">
            Todavía no hay preguntas. Agrega la primera.
          </div>
        )}

        {preguntas.map((pregunta, i) => (
          <div key={pregunta.id} className="bg-white border border-slate-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <span className="text-sm font-semibold text-slate-400 mt-2">{i + 1}.</span>
              <div className="flex-1">
                <input
                  value={pregunta.texto}
                  onChange={(e) => cambiarPregunta(pregunta.id, { texto: e.target.value })}
                  placeholder="Escribe la pregunta..."
                  className="w-full border border-transparent focus:border-slate-300 rounded px-2 py-1 -mx-2 font-medium text-[#1f2421] focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                />

                <select
                  value={pregunta.tipo}
                  onChange={(e) => cambiarTipo(pregunta.id, e.target.value as Pregunta['tipo'])}
                  className="mt-2 border border-slate-300 rounded px-2 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                >
                  {(Object.keys(ETIQUETAS_TIPO) as Pregunta['tipo'][]).map((t) => (
                    <option key={t} value={t}>
                      {ETIQUETAS_TIPO[t]}
                    </option>
                  ))}
                </select>

                {pregunta.tipo === 'opcion_multiple' && (
                  <div className="mt-3">
                    {pregunta.opciones?.map((opcion, j) => (
                      <div key={j} className="flex items-center gap-2 mb-1">
                        <input
                          value={opcion}
                          onChange={(e) => actualizarOpcion(pregunta.id, j, e.target.value)}
                          placeholder={`Opción ${j + 1}`}
                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                        />
                        <button
                          onClick={() => eliminarOpcion(pregunta.id, j)}
                          className="text-slate-300 hover:text-red-500 shrink-0"
                          title="Eliminar opción"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => agregarOpcion(pregunta.id)}
                      className="text-sm text-[#008751] font-medium hover:underline mt-1"
                    >
                      + Agregar opción
                    </button>
                  </div>
                )}

                {pregunta.tipo === 'matriz' && (
                  <div className="mt-3 flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Filas</p>
                      {pregunta.opciones?.map((fila, j) => (
                        <div key={j} className="flex items-center gap-2 mb-1">
                          <input
                            value={fila}
                            onChange={(e) => actualizarOpcion(pregunta.id, j, e.target.value)}
                            placeholder={`Fila ${j + 1}`}
                            className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                          />
                          <button
                            onClick={() => eliminarOpcion(pregunta.id, j)}
                            className="text-slate-300 hover:text-red-500 shrink-0"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => agregarOpcion(pregunta.id)}
                        className="text-sm text-[#008751] font-medium hover:underline mt-1"
                      >
                        + Agregar fila
                      </button>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Columnas</p>
                      {pregunta.columnas?.map((columna, j) => (
                        <div key={j} className="flex items-center gap-2 mb-1">
                          <input
                            value={columna}
                            onChange={(e) => actualizarColumna(pregunta.id, j, e.target.value)}
                            placeholder={`Columna ${j + 1}`}
                            className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
                          />
                          <button
                            onClick={() => eliminarColumna(pregunta.id, j)}
                            className="text-slate-300 hover:text-red-500 shrink-0"
                            title="Eliminar columna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => agregarColumna(pregunta.id)}
                        className="text-sm text-[#008751] font-medium hover:underline mt-1"
                      >
                        + Agregar columna
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {pregunta.tipo === 'escala' && (
                <span className="text-xs text-slate-400 mt-2 shrink-0">
                  Se responde con 1 a 5
                </span>
              )}

              <div className="flex flex-col gap-1 shrink-0 mt-1">
                <button
                  onClick={() => moverPregunta(i, -1)}
                  disabled={i === 0}
                  className="text-slate-300 hover:text-[#1f2421] disabled:opacity-30"
                  title="Subir pregunta"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moverPregunta(i, 1)}
                  disabled={i === preguntas.length - 1}
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