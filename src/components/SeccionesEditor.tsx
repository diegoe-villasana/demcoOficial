import React from 'react';
import { ChevronDown, ChevronUp, FolderTree, Plus, Trash2, X } from 'lucide-react';
import { Pregunta, Seccion } from '../db/schema';
import { nuevaSeccion } from '../services/secciones';

interface SeccionesEditorProps {
  secciones: Seccion[];
  preguntas: Pregunta[];
  onCambiarSecciones: (secciones: Seccion[]) => void;
  onAsignarPregunta: (preguntaId: string, seccionId: string | undefined) => void;
}

/**
 * Editor de las secciones de la encuesta: crea, renombra, reordena y borra
 * los tramos, y decide qué preguntas quedan en cada uno.
 */
export const SeccionesEditor: React.FC<SeccionesEditorProps> = ({
  secciones,
  preguntas,
  onCambiarSecciones,
  onAsignarPregunta,
}) => {
  const agregarSeccion = () => {
    const nueva = nuevaSeccion(secciones.length + 1);
    onCambiarSecciones([...secciones, nueva]);
  };

  const cambiarSeccion = (id: string, cambios: Partial<Seccion>) => {
    onCambiarSecciones(
      secciones.map((s) => (s.id === id ? { ...s, ...cambios } : s))
    );
  };

  const moverSeccion = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= secciones.length) return;
    const copia = [...secciones];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onCambiarSecciones(copia);
  };

  const eliminarSeccion = (id: string) => {
    // Las preguntas de la sección borrada no se pierden: quedan sin sección.
    preguntas.forEach((p) => {
      if (p.seccionId === id) onAsignarPregunta(p.id, undefined);
    });
    onCambiarSecciones(secciones.filter((s) => s.id !== id));
  };

  const preguntasDe = (seccionId: string) =>
    preguntas.filter((p) => p.seccionId === seccionId);

  const sinSeccion = preguntas.filter(
    (p) => !p.seccionId || !secciones.some((s) => s.id === p.seccionId)
  );

  const campoCls =
    'border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#008751]/30';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-[#1f2421] flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-[#008751]" /> Secciones
          <span className="text-slate-400 font-normal">
            ({secciones.length ? secciones.length : 'sin seccionar'})
          </span>
        </p>
        <button
          onClick={agregarSeccion}
          className="flex items-center gap-1 border border-[#008751] text-[#008751] hover:bg-[#008751]/5 rounded px-3 py-1.5 text-sm font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar sección
        </button>
      </div>

      {secciones.length === 0 && (
        <p className="text-sm text-slate-500">
          La encuesta es una sola parte. Crea secciones para dividirla en tramos
          (por ejemplo: <i>Datos generales</i>, <i>Servicio</i>, <i>Opinión</i>).
        </p>
      )}

      <div className="flex flex-col gap-3">
        {secciones.map((seccion, i) => {
          const asignadas = preguntasDe(seccion.id);
          const disponibles = preguntas.filter(
            (p) => p.seccionId !== seccion.id
          );

          return (
            <div key={seccion.id} className="bg-white border border-slate-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1 shrink-0 mt-1">
                  <button
                    onClick={() => moverSeccion(i, -1)}
                    disabled={i === 0}
                    className="text-slate-300 hover:text-[#1f2421] disabled:opacity-30"
                    title="Subir sección"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moverSeccion(i, 1)}
                    disabled={i === secciones.length - 1}
                    className="text-slate-300 hover:text-[#1f2421] disabled:opacity-30"
                    title="Bajar sección"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <input
                    value={seccion.titulo}
                    onChange={(e) => cambiarSeccion(seccion.id, { titulo: e.target.value })}
                    placeholder="Título de la sección"
                    className={`${campoCls} font-medium text-[#1f2421]`}
                  />
                  <input
                    value={seccion.descripcion ?? ''}
                    onChange={(e) => cambiarSeccion(seccion.id, { descripcion: e.target.value })}
                    placeholder="Descripción (opcional)"
                    className={`${campoCls} text-slate-600`}
                  />

                  <div className="text-xs text-slate-500">
                    Preguntas en esta sección: <b>{asignadas.length}</b>
                  </div>

                  {asignadas.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {asignadas.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded px-2 py-1"
                        >
                          <span className="text-sm text-slate-600 truncate flex-1">
                            {p.texto || '(sin texto)'}
                          </span>
                          <button
                            onClick={() => onAsignarPregunta(p.id, undefined)}
                            className="text-slate-300 hover:text-red-500 shrink-0"
                            title="Quitar de la sección"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onAsignarPregunta(e.target.value, seccion.id);
                    }}
                    className={`${campoCls} text-slate-600`}
                  >
                    <option value="">+ Mover una pregunta a esta sección…</option>
                    {disponibles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.texto || '(sin texto)'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => eliminarSeccion(seccion.id)}
                  className="text-slate-300 hover:text-red-500 shrink-0 mt-1"
                  title="Eliminar sección"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {secciones.length > 0 && (
        <p className="text-xs text-slate-500 mt-3">
          {sinSeccion.length > 0 ? (
            <>
              {sinSeccion.length} pregunta{sinSeccion.length > 1 ? 's' : ''} sin sección: se
              muestran al final, sin encabezado.
            </>
          ) : (
            'Todas las preguntas están dentro de una sección.'
          )}
        </p>
      )}
    </div>
  );
};
