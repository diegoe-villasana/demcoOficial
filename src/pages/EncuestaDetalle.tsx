import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { obtenerEncuesta, guardarRespuesta } from '../services/encuestasService';
import { Encuesta } from '../db/schema';

export const EncuestaDetalle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encuesta, setEncuesta] = useState<Encuesta | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string | number>>({});
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    (async () => {
      if (id) setEncuesta((await obtenerEncuesta(id)) ?? null);
    })();
  }, [id]);

  const handleChange = (preguntaId: string, valor: string | number) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encuesta) return;

    // Se guarda en IndexedDB de inmediato (funciona con o sin internet) y
    // el servicio se encarga de intentar sincronizar o dejarla en cola.
    await guardarRespuesta({
      id: crypto.randomUUID(),
      encuestaId: encuesta.id,
      versionId: encuesta.versionId,
      respuestas,
      fechaRespuesta: new Date().toISOString(),
    });

    setEnviado(true);
  };

  if (!encuesta) {
    return <p className="text-slate-500">Cargando encuesta...</p>;
  }

  if (enviado) {
    return (
      <div className="max-w-lg bg-white border border-slate-200 rounded-md p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-[#008751] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#1f2421] mb-2">¡Respuesta guardada!</h2>
        <p className="text-slate-500 mb-6">
          Se enviará automáticamente cuando haya conexión a internet.
        </p>
        <button
          onClick={() => navigate('/home/encuestas')}
          className="bg-[#008751] hover:bg-green-700 text-white rounded px-5 py-2 font-medium"
        >
          Volver a Encuestas
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/home/encuestas')}
        className="flex items-center gap-1 text-slate-500 hover:text-[#1f2421] mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <h1 className="text-2xl font-semibold text-[#1f2421] mb-1">{encuesta.titulo}</h1>
      {encuesta.descripcion && <p className="text-slate-500 mb-6">{encuesta.descripcion}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {encuesta.preguntas.map((pregunta) => (
          <div key={pregunta.id} className="bg-white border border-slate-200 rounded-md p-5">
            <label className="block font-medium text-[#1f2421] mb-3">{pregunta.texto}</label>

            {pregunta.tipo === 'texto' && (
              <textarea
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008751]"
                rows={3}
                onChange={(e) => handleChange(pregunta.id, e.target.value)}
              />
            )}

            {pregunta.tipo === 'opcion_multiple' && (
              <div className="flex flex-col gap-2">
                {pregunta.opciones?.map((opcion) => (
                  <label key={opcion} className="flex items-center gap-2 text-slate-700">
                    <input
                      type="radio"
                      name={pregunta.id}
                      value={opcion}
                      onChange={(e) => handleChange(pregunta.id, e.target.value)}
                      required
                    />
                    {opcion}
                  </label>
                ))}
              </div>
            )}

            {pregunta.tipo === 'escala' && (
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((valor) => (
                  <label key={valor} className="flex flex-col items-center gap-1 text-sm text-slate-600">
                    <input
                      type="radio"
                      name={pregunta.id}
                      value={valor}
                      onChange={() => handleChange(pregunta.id, valor)}
                      required
                    />
                    {valor}
                  </label>
                ))}
              </div>
            )}

            {pregunta.tipo === 'matriz' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-medium text-slate-500 pb-2 pr-4"></th>
                      {(pregunta.columnas ?? ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo']).map(
                        (columna) => (
                          <th key={columna} className="font-medium text-slate-500 pb-2 px-2 text-center">
                            {columna}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(pregunta.opciones ?? []).map((fila) => (
                      <tr key={fila} className="border-t border-slate-100">
                        <td className="text-slate-700 py-2 pr-4">{fila}</td>
                        {(pregunta.columnas ?? ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo']).map(
                          (columna) => (
                            <td key={columna} className="text-center py-2">
                              <input
                                type="radio"
                                name={`${pregunta.id}-${fila}`}
                                value={columna}
                                onChange={() => handleChange(`${pregunta.id}-${fila}`, columna)}
                                required
                              />
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        <button
          type="submit"
          className="bg-[#008751] hover:bg-green-700 text-white rounded py-3 font-medium"
        >
          Enviar respuestas
        </button>
      </form>
    </div>
  );
};
