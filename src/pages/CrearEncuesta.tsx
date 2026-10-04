import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, FileText, X, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Encuesta } from '../db/schema';
import { guardarEncuestaCompleta } from '../services/encuestasService';
import {
  extraerTextoDocx,
  convertirTextoEnEncuesta,
  etiquetaTipo,
} from '../services/parseWordEncuesta';

const COLORES_TIPO: Record<string, string> = {
  Múltiple: 'bg-blue-100 text-blue-700',
  Abierta: 'bg-amber-100 text-amber-700',
  Matriz: 'bg-purple-100 text-purple-700',
  Escala: 'bg-teal-100 text-teal-700',
};

export const CrearEncuesta: React.FC = () => {
  const navigate = useNavigate();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [encuesta, setEncuesta] = useState<Encuesta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manejarArchivo = async (file: File) => {
    setError(null);
    setEncuesta(null);
    setArchivo(file);

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Solo se aceptan archivos de Word con extensión .docx');
      return;
    }

    setCargando(true);
    try {
      const texto = await extraerTextoDocx(file);
      if (!texto.trim()) {
        setError('El archivo está vacío o no contiene texto legible.');
        return;
      }
      setEncuesta(convertirTextoEnEncuesta(texto));
    } catch {
      setError('No se pudo leer el archivo. Asegúrate de que sea un .docx válido.');
    } finally {
      setCargando(false);
    }
  };

  const eliminarPregunta = (id: string) => {
    setEncuesta((prev) =>
      prev ? { ...prev, preguntas: prev.preguntas.filter((p) => p.id !== id) } : prev
    );
  };

  const guardar = async () => {
    if (!encuesta || encuesta.preguntas.length === 0) return;
    try {
      // Persiste en el servidor (crea v1) y refresca el caché local; solo así
      // la encuesta sale en el correo y /e/:id la sirve al destinatario.
      await guardarEncuestaCompleta(
        {
          titulo: encuesta.titulo,
          descripcion: encuesta.descripcion,
          preguntas: encuesta.preguntas,
        },
        undefined
      );
      navigate('/home/encuestas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la encuesta.');
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

      <h1 className="text-2xl font-semibold text-[#1f2421] mb-1">Crear encuesta</h1>
      <p className="text-slate-500 mb-6">
        Sube un archivo de Word y crea la encuesta automáticamente
      </p>

      {!encuesta && (
        <div>
          <label
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-md p-10 cursor-pointer hover:bg-slate-50 transition-colors ${
              error ? 'border-red-300' : 'border-slate-300'
            }`}
          >
            <input
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) manejarArchivo(file);
              }}
            />
            <div className="w-12 h-12 rounded-full bg-[#008751]/10 flex items-center justify-center">
              <FileUp className="w-6 h-6 text-[#008751]" />
            </div>
            <div className="text-center">
              <p className="font-medium text-[#1f2421]">
                {cargando ? 'Leyendo el documento...' : 'Subir archivo de Word (.docx)'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Marca cada pregunta con [Múltiple], [Abierta] o [Matriz] al final
              </p>
            </div>
          </label>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-md p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">Para que funcione, tu documento debe seguir este formato:</p>
            <p className="font-mono text-blue-900 whitespace-pre-line bg-white rounded p-3">
{`Título de la encuesta
¿Cuál es tu barrio? [Múltiple]
- Centro
- Norte
- Sur
¿Qué opinas del servicio? [Abierta]
¿Cómo calificas estos aspectos? [Matriz]
- Atención al cliente
- Calidad del servicio`}
            </p>
          </div>
        </div>
      )}

      {encuesta && (
        <div className="bg-white border border-slate-200 rounded-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#008751]/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#008751]" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Documento: {archivo?.name}</p>
              <input
                className="text-xl font-semibold text-[#1f2421] border border-transparent focus:border-slate-300 rounded px-1 -mx-1 w-full focus:outline-none"
                value={encuesta.titulo}
                onChange={(e) =>
                  setEncuesta((prev) => (prev ? { ...prev, titulo: e.target.value } : prev))
                }
              />
            </div>
          </div>

          {encuesta.preguntas.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">
              No se detectaron preguntas. Revisa el formato del documento.
            </p>
          ) : (
            <ul className="flex flex-col gap-3 mb-6">
              {encuesta.preguntas.map((pregunta, index) => (
                <li
                  key={pregunta.id}
                  className="border border-slate-200 rounded-md p-4 flex items-start gap-3"
                >
                  <span className="text-sm font-semibold text-slate-400 mt-0.5">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[#1f2421]">{pregunta.texto}</p>
                      <button
                        onClick={() => eliminarPregunta(pregunta.id)}
                        title="Eliminar pregunta"
                        className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full mt-2 ${
                        COLORES_TIPO[etiquetaTipo(pregunta.tipo)] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {etiquetaTipo(pregunta.tipo)}
                    </span>
                    {pregunta.opciones && pregunta.opciones.length > 0 && (
                      <p className="text-sm text-slate-500 mt-2">
                        Opciones: {pregunta.opciones.join(', ')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-3">
            <button
              onClick={guardar}
              disabled={!encuesta.titulo.trim() || encuesta.preguntas.length === 0}
              className="flex items-center gap-2 bg-[#008751] hover:bg-green-700 disabled:opacity-50 text-white rounded px-5 py-2 font-medium"
            >
              <Save className="w-4 h-4" /> Guardar encuesta
            </button>
            <button
              onClick={() => {
                setEncuesta(null);
                setArchivo(null);
                setError(null);
              }}
              className="flex items-center gap-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded px-5 py-2 font-medium"
            >
              <Trash2 className="w-4 h-4" /> Subir otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};