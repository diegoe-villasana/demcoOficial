import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  WifiOff,
  RefreshCw,
  Plus,
  Link2,
  X,
  Check,
  Copy,
  AlertCircle,
  BarChart3,
  Pencil,
  Lock,
  FileUp,
} from 'lucide-react';
import { inicializarEncuestas, obtenerEncuestas, obtenerLinkPublico } from '../services/encuestasService';
import { Encuesta } from '../db/schema';
import { useSyncEncuestas } from '../hooks/useSyncEncuestas';

export const EncuestasPage: React.FC = () => {
  const navigate = useNavigate();
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  const [modalAbierto, setModalAbierto] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [errorCopiar, setErrorCopiar] = useState<string | null>(null);

  const { isOnline, pendientes, sincronizando, sincronizarAhora } = useSyncEncuestas();

  useEffect(() => {
    (async () => {
      await inicializarEncuestas();
      setEncuestas(await obtenerEncuestas());
    })();
  }, []);

  const toggleSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const nueva = new Set(prev);
      if (nueva.has(id)) {
        nueva.delete(id);
      } else {
        nueva.add(id);
      }
      return nueva;
    });
  };

  const encuestasSeleccionadas = encuestas.filter((e) => seleccionadas.has(e.id));

  const abrirModal = () => {
    setModalAbierto(true);
    setCopiado(null);
    setErrorCopiar(null);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setCopiado(null);
    setErrorCopiar(null);
  };

  const limpiarSeleccion = () => setSeleccionadas(new Set());

  const copiar = async (texto: string, clave: string) => {
    setErrorCopiar(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const area = document.createElement('textarea');
        area.value = texto;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      setCopiado(clave);
      window.setTimeout(() => setCopiado((actual) => (actual === clave ? null : actual)), 2000);
    } catch {
      setErrorCopiar('No se pudo copiar el enlace. Selecciónalo y cópialo manualmente.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-[#1f2421]">Encuestas</h1>
        {!isOnline && (
          <span className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            <WifiOff className="w-4 h-4" /> Sin conexión — tus respuestas se guardan localmente
          </span>
        )}
      </div>
      <p className="text-slate-500 mb-6">Disponibles para responder, incluso sin internet</p>

      {pendientes > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-700 rounded-md px-4 py-3 mb-6 text-sm">
          <span>
            {pendientes} respuesta{pendientes > 1 ? 's' : ''} pendiente{pendientes > 1 ? 's' : ''} de sincronizar
          </span>
          <button
            onClick={sincronizarAhora}
            disabled={!isOnline || sincronizando}
            className="flex items-center gap-1 text-blue-700 font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
            {sincronizando ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {encuestas.map((encuesta) => (
          <div
            key={encuesta.id}
            onClick={() => navigate(`/home/encuestas/${encuesta.id}`)}
            className={`bg-white border rounded-md p-5 text-left hover:shadow-md transition-shadow flex gap-4 cursor-pointer ${
              seleccionadas.has(encuesta.id) ? 'border-[#008751] ring-2 ring-[#008751]/30' : 'border-slate-200'
            }`}
          >
            <input
              type="checkbox"
              checked={seleccionadas.has(encuesta.id)}
              onChange={() => toggleSeleccion(encuesta.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 mt-1 accent-[#008751] shrink-0"
              aria-label={`Seleccionar ${encuesta.titulo}`}
            />
            <div className="w-10 h-10 rounded-full bg-[#008751]/10 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-[#008751]" />
            </div>
            <div>
              <p className="font-medium text-[#1f2421]">{encuesta.titulo}</p>
              {encuesta.descripcion && (
                <p className="text-sm text-slate-500 mt-1">{encuesta.descripcion}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                <span>{encuesta.preguntas.length} preguntas</span>
                {encuesta.versionNumero !== undefined && (
                  <span className="flex items-center gap-1">
                    v{encuesta.versionNumero}
                    {encuesta.sellada && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-px">
                        <Lock className="w-3 h-3" /> sellada
                      </span>
                    )}
                  </span>
                )}
                {encuesta.totalRespuestas !== undefined && (
                  <span>{encuesta.totalRespuestas} respuestas</span>
                )}
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/home/encuestas/${encuesta.id}/editar`);
                  }}
                  className="flex items-center gap-1 text-xs text-[#008751] font-medium hover:underline"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/home/encuestas/${encuesta.id}/respuestas`);
                  }}
                  className="flex items-center gap-1 text-xs text-[#008751] font-medium hover:underline"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Ver respuestas
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => navigate('/home/encuestas/nueva')}
          className="bg-white border border-slate-200 rounded-md p-5 text-left hover:shadow-md transition-shadow flex gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-[#008751]/10 flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5 text-[#008751]" />
          </div>
          <div>
            <p className="font-medium text-[#1f2421]">Crear nueva encuesta</p>
            <p className="text-sm text-slate-500 mt-1">Diseño desde cero, preguntas y opciones</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/home/crear-encuesta')}
          className="bg-white border border-slate-200 rounded-md p-5 text-left hover:shadow-md transition-shadow flex gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-[#008751]/10 flex items-center justify-center shrink-0">
            <FileUp className="w-5 h-5 text-[#008751]" />
          </div>
          <div>
            <p className="font-medium text-[#1f2421]">Subir documento Word</p>
            <p className="text-sm text-slate-500 mt-1">Crea la encuesta desde un .docx (Múltiple, Abierta, Matriz)</p>
          </div>
        </button>
      </div>

      {seleccionadas.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#1f2421] text-white rounded-full shadow-lg flex items-center gap-3 px-2 py-2 pl-5">
          <span className="text-sm font-medium whitespace-nowrap">
            {seleccionadas.size} seleccionada{seleccionadas.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={limpiarSeleccion}
            className="text-slate-300 hover:text-white text-sm px-2"
          >
            Limpiar
          </button>
          <button
            onClick={abrirModal}
            className="flex items-center gap-2 bg-[#008751] hover:bg-green-700 text-white rounded-full px-4 py-2 text-sm font-medium"
          >
            <Link2 className="w-4 h-4" /> Compartir enlace
          </button>
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1f2421] flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-[#008751]" /> Compartir enlace
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {encuestasSeleccionadas.length} encuesta{encuestasSeleccionadas.length > 1 ? 's' : ''} seleccionada{encuestasSeleccionadas.length > 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-[#1f2421]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Copia el enlace y compártelo. Quien lo reciba podrá responder la
              encuesta sin necesidad de una cuenta.
            </p>

            <div className="flex flex-col gap-3">
              {encuestasSeleccionadas.map((enc) => {
                const link = obtenerLinkPublico(enc.id);
                const esCopiado = copiado === enc.id;
                return (
                  <div key={enc.id} className="border border-slate-200 rounded-md p-4">
                    <p className="text-sm font-medium text-[#1f2421] flex items-center gap-2 mb-2">
                      <ClipboardList className="w-4 h-4 text-[#008751] shrink-0" />
                      {enc.titulo}
                    </p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={link}
                        onFocus={(e) => e.currentTarget.select()}
                        className="flex-1 min-w-0 border border-slate-300 rounded px-3 py-2 text-xs text-slate-600 bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => copiar(link, enc.id)}
                        className="flex items-center gap-1.5 bg-[#008751] hover:bg-green-700 text-white rounded px-3 py-2 text-sm font-medium shrink-0"
                      >
                        {esCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {esCopiado ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {errorCopiar && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm mt-4">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorCopiar}</span>
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={cerrarModal}
                className="px-4 py-2 text-sm rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};