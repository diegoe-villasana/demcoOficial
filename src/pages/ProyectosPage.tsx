import React from 'react';

const mockProjects = [
  { nombre: 'Subestación Norte', estado: 'En progreso', avance: 68, fecha: '2026-08-15' },
  { nombre: 'Red Residencial Fase 2', estado: 'Planeación', avance: 20, fecha: '2026-09-30' },
  { nombre: 'Mantenimiento Línea 14', estado: 'Completado', avance: 100, fecha: '2026-06-10' },
  { nombre: 'Ampliación Zona Industrial', estado: 'En progreso', avance: 45, fecha: '2026-10-01' },
  { nombre: 'Digitalización Medidores', estado: 'Retrasado', avance: 30, fecha: '2026-07-05' },
];

const estadoColor: Record<string, string> = {
  'En progreso': 'bg-blue-100 text-blue-700',
  Planeación: 'bg-slate-100 text-slate-700',
  Completado: 'bg-green-100 text-green-700',
  Retrasado: 'bg-red-100 text-red-700',
};

export const ProyectosPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1f2421] mb-1">Mis Proyectos</h1>
      <p className="text-slate-500 mb-6">Listado de ejemplo</p>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3 text-sm font-medium text-slate-500">Proyecto</th>
              <th className="px-5 py-3 text-sm font-medium text-slate-500">Estado</th>
              <th className="px-5 py-3 text-sm font-medium text-slate-500">Avance</th>
              <th className="px-5 py-3 text-sm font-medium text-slate-500">Fecha estimada</th>
            </tr>
          </thead>
          <tbody>
            {mockProjects.map((p) => (
              <tr key={p.nombre} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-4 text-[#1f2421] font-medium">{p.nombre}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoColor[p.estado]}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#008751]" style={{ width: `${p.avance}%` }} />
                    </div>
                    <span className="text-sm text-slate-500">{p.avance}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-500">{p.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
