import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, ChevronUp, ChevronDown, Paperclip } from 'lucide-react';
import { obtenerEncuesta, guardarRespuesta } from '../services/encuestasService';
import { Encuesta, Pregunta, ValorRespuesta } from '../db/schema';
import {
  COLUMNAS_LIKERT,
  esInformativa,
  rangoEscala,
  tieneComentario,
  usaColumnas,
} from '../services/tiposPregunta';

type Respuestas = Record<string, ValorRespuesta>;

interface InputPreguntaProps {
  pregunta: Pregunta;
  respuestas: Respuestas;
  onChange: (clave: string, valor: ValorRespuesta) => void;
}

const inputCls =
  'w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#008751]';

const PREFIJO_OTRO = 'Otro: ';

/** Una celda de matriz: mismo control para todo lo que sea "una de N". */
const CeldaOpciones: React.FC<{
  nombre: string;
  pregunta: Pregunta;
  respuestas: Respuestas;
  onChange: (clave: string, valor: ValorRespuesta) => void;
  columnas: string[];
}> = ({ nombre, pregunta, respuestas, onChange, columnas }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className="text-left font-medium text-slate-500 pb-2 pr-4"></th>
          {columnas.map((columna) => (
            <th key={columna} className="font-medium text-slate-500 pb-2 px-2 text-center whitespace-nowrap">
              {columna}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(pregunta.opciones ?? []).map((fila) => (
          <tr key={fila} className="border-t border-slate-100">
            <td className="text-slate-700 py-2 pr-4">{fila}</td>
            {columnas.map((columna) => (
              <td key={columna} className="text-center py-2">
                <input
                  type="radio"
                  name={`${nombre}-${fila}`}
                  checked={respuestas[`${nombre}-${fila}`] === columna}
                  onChange={() => onChange(`${nombre}-${fila}`, columna)}
                  required={pregunta.obligatorio}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const InputPregunta: React.FC<InputPreguntaProps> = ({ pregunta, respuestas, onChange }) => {
  const { tipo, id } = pregunta;
  const opciones = pregunta.opciones ?? [];
  const columnas = usaColumnas(tipo) && (pregunta.columnas ?? []).length > 0
    ? pregunta.columnas!
    : COLUMNAS_LIKERT;
  const rango = rangoEscala(pregunta);

  const lista = respuestas[id];
  const seleccionados: string[] = Array.isArray(lista) ? lista : [];

  const alternar = (opcion: string) => {
    const siguiente = seleccionados.includes(opcion)
      ? seleccionados.filter((o) => o !== opcion)
      : [...seleccionados, opcion];
    onChange(id, siguiente);
  };

  const claveFila = (fila: string) => `${id}-${fila}`;

  const mover = (orden: string[], indice: number, dir: -1 | 1) => {
    const j = indice + dir;
    if (j < 0 || j >= orden.length) return orden;
    const copia = [...orden];
    [copia[indice], copia[j]] = [copia[j], copia[indice]];
    return copia;
  };

  const puntos = Math.max(2, pregunta.puntos ?? 5);

  switch (tipo) {
    case 'mostrar_texto':
      return <p className="text-slate-600 text-sm whitespace-pre-line">{pregunta.texto}</p>;

    case 'texto':
    case 'texto_linea':
    case 'texto_parrafos': {
      const filas = tipo === 'texto_parrafos' ? 8 : tipo === 'texto_linea' ? 1 : 3;
      const el =
        filas === 1 ? (
          <input
            className={inputCls}
            value={String(respuestas[id] ?? '')}
            placeholder={pregunta.placeholder}
            required={pregunta.obligatorio}
            onChange={(e) => onChange(id, e.target.value)}
          />
        ) : (
          <textarea
            className={inputCls}
            rows={filas}
            value={String(respuestas[id] ?? '')}
            placeholder={pregunta.placeholder}
            required={pregunta.obligatorio}
            onChange={(e) => onChange(id, e.target.value)}
          />
        );
      return el;
    }

    case 'textos_multiples':
      return (
        <div className="flex flex-col gap-2">
          {opciones.map((fila) => (
            <div key={fila} className="flex items-center gap-2">
              <span className="text-sm text-slate-600 w-40 shrink-0 truncate">{fila}</span>
              <input
                className={inputCls}
                value={String(respuestas[claveFila(fila)] ?? '')}
                placeholder={pregunta.placeholder}
                required={pregunta.obligatorio}
                onChange={(e) => onChange(claveFila(fila), e.target.value)}
              />
            </div>
          ))}
        </div>
      );

    case 'numero':
      return (
        <input
          type="number"
          className={`${inputCls} w-48`}
          value={respuestas[id] === undefined ? '' : String(respuestas[id])}
          min={pregunta.minimo}
          max={pregunta.maximo}
          step={pregunta.formato === 'entero' ? 1 : 'any'}
          placeholder={pregunta.placeholder}
          required={pregunta.obligatorio}
          onChange={(e) => onChange(id, e.target.value === '' ? '' : Number(e.target.value))}
        />
      );

    case 'numero_multiple':
      return (
        <div className="flex flex-col gap-2">
          {opciones.map((fila) => {
            const clave = claveFila(fila);
            return (
              <div key={fila} className="flex items-center gap-2">
                <span className="text-sm text-slate-600 w-40 shrink-0 truncate">{fila}</span>
                <input
                  type="number"
                  className={`${inputCls} w-48`}
                  value={respuestas[clave] === undefined ? '' : String(respuestas[clave])}
                  min={pregunta.minimo}
                  max={pregunta.maximo}
                  step={pregunta.formato === 'entero' ? 1 : 'any'}
                  required={pregunta.obligatorio}
                  onChange={(e) => onChange(clave, e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>
      );

    case 'fecha':
      return (
        <input
          type="datetime-local"
          className={`${inputCls} w-64`}
          value={String(respuestas[id] ?? '')}
          required={pregunta.obligatorio}
          onChange={(e) => onChange(id, e.target.value)}
        />
      );

    case 'opcion_unica':
    case 'desplegable':
    case 'opcion_unica_comentario': {
      const comentario = `${id}-comentario`;
      const bloqueOpciones =
        tipo === 'desplegable' ? (
          <select
            className={inputCls}
            value={String(respuestas[id] ?? '')}
            required={pregunta.obligatorio}
            onChange={(e) => onChange(id, e.target.value)}
          >
            <option value="">Elige una opción…</option>
            {opciones.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex flex-col gap-2">
            {opciones.map((opcion) => (
              <label key={opcion} className="flex items-center gap-2 text-slate-700">
                <input
                  type="radio"
                  name={id}
                  checked={respuestas[id] === opcion}
                  onChange={() => onChange(id, opcion)}
                  required={pregunta.obligatorio}
                />
                {opcion}
              </label>
            ))}
          </div>
        );

      if (!tieneComentario(tipo)) return bloqueOpciones;

      return (
        <div className="flex flex-col gap-2">
          {bloqueOpciones}
          <input
            className={inputCls}
            value={String(respuestas[comentario] ?? '')}
            placeholder={pregunta.placeholder ?? 'Escribe tu comentario'}
            onChange={(e) => onChange(comentario, e.target.value)}
          />
        </div>
      );
    }

    case 'escala':
    case 'escala_n': {
      const valores: number[] = [];
      for (let v = rango.min; v <= rango.max; v++) valores.push(v);
      return (
        <div className="flex gap-3 flex-wrap">
          {valores.map((valor) => (
            <label key={valor} className="flex flex-col items-center gap-1 text-sm text-slate-600">
              <input
                type="radio"
                name={id}
                checked={Number(respuestas[id]) === valor}
                onChange={() => onChange(id, valor)}
                required={pregunta.obligatorio}
              />
              {valor}
            </label>
          ))}
        </div>
      );
    }

    case 'opcion_multiple':
    case 'opcion_multiple_comentario': {
      const conComentario = tieneComentario(tipo);
      return (
        <div className="flex flex-col gap-2">
          {opciones.map((opcion) => (
            <div key={opcion} className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={seleccionados.includes(opcion)}
                  onChange={() => alternar(opcion)}
                />
                {opcion}
              </label>
              {conComentario && seleccionados.includes(opcion) && (
                <input
                  className={`${inputCls} ml-6`}
                  value={String(respuestas[`${id}-comentario-${opcion}`] ?? '')}
                  placeholder={pregunta.placeholder ?? 'Escribe tu comentario'}
                  onChange={(e) => onChange(`${id}-comentario-${opcion}`, e.target.value)}
                />
              )}
            </div>
          ))}

          {pregunta.otro && (
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={seleccionados.some((o) => o.startsWith(PREFIJO_OTRO))}
                  onChange={() => {
                    if (seleccionados.some((o) => o.startsWith(PREFIJO_OTRO))) {
                      onChange(id, seleccionados.filter((o) => !o.startsWith(PREFIJO_OTRO)));
                    } else {
                      onChange(id, [...seleccionados, `${PREFIJO_OTRO}`]);
                    }
                  }}
                />
                Otro
              </label>
              {seleccionados.some((o) => o.startsWith(PREFIJO_OTRO)) && (
                <input
                  className={`${inputCls} ml-6`}
                  value={seleccionados.find((o) => o.startsWith(PREFIJO_OTRO))?.slice(PREFIJO_OTRO.length) ?? ''}
                  placeholder="Escribe tu respuesta"
                  onChange={(e) =>
                    onChange(
                      id,
                      seleccionados.filter((o) => !o.startsWith(PREFIJO_OTRO)).concat(
                        `${PREFIJO_OTRO}${e.target.value}`
                      )
                    )
                  }
                />
              )}
            </div>
          )}
        </div>
      );
    }

    case 'ranking': {
      const orden: string[] = seleccionados.length > 0 ? seleccionados : opciones;
      return (
        <div className="flex flex-col gap-2">
          {(pregunta.ejeIzquierdo || pregunta.ejeDerecho) && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>{pregunta.ejeIzquierdo}</span>
              <span>{pregunta.ejeDerecho}</span>
            </div>
          )}
          {orden.map((opcion, i) => (
            <div key={opcion} className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 w-6">{i + 1}.</span>
              <span className="flex-1 text-slate-700 text-sm">{opcion}</span>
              <button
                type="button"
                onClick={() => onChange(id, mover(orden, i, -1))}
                disabled={i === 0}
                className="text-slate-300 hover:text-[#1f2421] disabled:opacity-30"
                title="Subir"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(id, mover(orden, i, 1))}
                disabled={i === orden.length - 1}
                className="text-slate-300 hover:text-[#1f2421] disabled:opacity-30"
                title="Bajar"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      );
    }

    case 'archivo':
      return (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-slate-700 text-sm">
            <Paperclip className="w-4 h-4 text-slate-400" />
            <input
              type="file"
              multiple={pregunta.variosArchivos}
              accept={(pregunta.extensiones ?? []).map((x) => `.${x}`).join(',')}
              onChange={(e) => {
                const nombres = Array.from(e.target.files ?? []).map(
                  (f) => `${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB)`
                );
                onChange(id, nombres);
              }}
            />
          </label>
          {seleccionados.length > 0 && (
            <ul className="text-sm text-slate-500 list-disc pl-5">
              {seleccionados.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          {(pregunta.extensiones?.length ?? 0) > 0 && (
            <p className="text-xs text-slate-400">
              Formatos: {(pregunta.extensiones ?? []).join(', ')} · máx.{' '}
              {pregunta.tamanoMaximo ?? 10} MB por archivo
            </p>
          )}
        </div>
      );

    case 'matriz':
    case 'matriz_aumentar':
    case 'matriz_sino':
      return (
        <CeldaOpciones
          nombre={id}
          pregunta={pregunta}
          respuestas={respuestas}
          onChange={onChange}
          columnas={columnas}
        />
      );

    case 'matriz_columnas':
      return (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500">
            Opciones: {opciones.join(' · ')}
          </p>
          {(pregunta.columnas ?? []).map((columna) => (
            <div key={columna} className="flex flex-col gap-1">
              <span className="text-sm text-slate-700">{columna}</span>
              <div className="flex flex-wrap gap-3">
                {opciones.map((opcion) => (
                  <label key={opcion} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name={`${id}-${columna}`}
                      checked={respuestas[claveFila(columna)] === opcion}
                      onChange={() => onChange(claveFila(columna), opcion)}
                      required={pregunta.obligatorio}
                    />
                    {opcion}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case 'matriz_escala':
      return (
        <CeldaOpciones
          nombre={id}
          pregunta={pregunta}
          respuestas={respuestas}
          onChange={onChange}
          columnas={Array.from({ length: rango.max - rango.min + 1 }, (_, i) => String(rango.min + i))}
        />
      );

    case 'matriz_texto':
      return (
        <div className="flex flex-col gap-2">
          {opciones.map((fila) => (
            <div key={fila} className="flex items-center gap-2">
              <span className="text-sm text-slate-600 w-40 shrink-0 truncate">{fila}</span>
              <input
                className={inputCls}
                value={String(respuestas[claveFila(fila)] ?? '')}
                required={pregunta.obligatorio}
                onChange={(e) => onChange(claveFila(fila), e.target.value)}
              />
            </div>
          ))}
        </div>
      );

    case 'matriz_numero':
      return (
        <div className="flex flex-col gap-2">
          {opciones.map((fila) => {
            const clave = claveFila(fila);
            return (
              <div key={fila} className="flex items-center gap-2">
                <span className="text-sm text-slate-600 w-40 shrink-0 truncate">{fila}</span>
                <input
                  type="number"
                  className={`${inputCls} w-40`}
                  value={respuestas[clave] === undefined ? '' : String(respuestas[clave])}
                  step={pregunta.formato === 'entero' ? 1 : 'any'}
                  required={pregunta.obligatorio}
                  onChange={(e) => onChange(clave, e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>
      );

    case 'matriz_doble_eje':
      return (
        <div className="flex flex-col gap-5">
          {opciones.map((fila) => (
            <div key={fila} className="flex flex-col gap-1">
              <span className="text-sm text-slate-700">{fila}</span>
              {(['izq', 'der'] as const).map((lado) => (
                <div key={lado} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-28 shrink-0 text-right">
                    {lado === 'izq' ? pregunta.ejeIzquierdo : pregunta.ejeDerecho}
                  </span>
                  <div className="flex gap-3">
                    {Array.from({ length: puntos }, (_, i) => i + 1).map((valor) => {
                      const clave = `${id}-${fila}-${lado}`;
                      return (
                        <label
                          key={valor}
                          className="flex flex-col items-center gap-1 text-xs text-slate-600"
                        >
                          <input
                            type="radio"
                            name={clave}
                            checked={Number(respuestas[clave]) === valor}
                            onChange={() => onChange(clave, valor)}
                            required={pregunta.obligatorio}
                          />
                          {valor}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );

    default:
      return (
        <input
          className={inputCls}
          value={String(respuestas[id] ?? '')}
          onChange={(e) => onChange(id, e.target.value)}
        />
      );
  }
};

export const EncuestaDetalle: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encuesta, setEncuesta] = useState<Encuesta | null>(null);
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    (async () => {
      if (id) setEncuesta((await obtenerEncuesta(id)) ?? null);
    })();
  }, [id]);

  const preguntasRespondibles = useMemo(
    () => (encuesta?.preguntas ?? []).filter((p) => !esInformativa(p.tipo)),
    [encuesta]
  );

  const handleChange = (clave: string, valor: ValorRespuesta) => {
    setRespuestas((prev) => ({ ...prev, [clave]: valor }));
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
        {encuesta.preguntas.map((pregunta, i) => {
          if (esInformativa(pregunta.tipo)) {
            return (
              <div key={pregunta.id} className="bg-slate-50 border border-slate-200 rounded-md p-5">
                <InputPregunta
                  pregunta={pregunta}
                  respuestas={respuestas}
                  onChange={handleChange}
                />
              </div>
            );
          }

          return (
            <div key={pregunta.id} className="bg-white border border-slate-200 rounded-md p-5">
              <label className="block font-medium text-[#1f2421] mb-3">
                {i + 1}. {pregunta.texto}
                {pregunta.obligatorio && <span className="text-red-500"> *</span>}
              </label>

              <InputPregunta
                pregunta={pregunta}
                respuestas={respuestas}
                onChange={handleChange}
              />
            </div>
          );
        })}

        {preguntasRespondibles.length > 0 && (
          <button
            type="submit"
            className="bg-[#008751] hover:bg-green-700 text-white rounded py-3 font-medium"
          >
            Enviar respuestas
          </button>
        )}
      </form>
    </div>
  );
};
