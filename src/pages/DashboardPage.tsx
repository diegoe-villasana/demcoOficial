import React from 'react';
import { TrendingUp, AlertTriangle, Gauge, DollarSign, FolderKanban } from 'lucide-react';

const mockKpis = [
  { label: 'Proyectos activos', value: '12', icon: FolderKanban, color: '#008751' },
  { label: 'Consumo total (kWh)', value: '48,320', icon: Gauge, color: '#3a7ca5' },
  { label: 'Facturación estimada', value: '$92,450', icon: DollarSign, color: '#1f2421' },
  { label: 'Alertas activas', value: '3', icon: AlertTriangle, color: '#c0392b' },
];

const mockChart = [
  { mes: 'Ene', consumo: 3200 },
  { mes: 'Feb', consumo: 3900 },
  { mes: 'Mar', consumo: 3500 },
  { mes: 'Abr', consumo: 4200 },
  { mes: 'May', consumo: 4800 },
  { mes: 'Jun', consumo: 4100 },
];

export const DashboardPage: React.FC = () => {
  const maxConsumo = Math.max(...mockChart.map((d) => d.consumo));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1f2421] mb-1">Dashboard</h1>
      <p className="text-slate-500 mb-6">Resumen general (datos de ejemplo)</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mockKpis.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white border border-slate-200 rounded-md p-5 flex items-center gap-4"
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}1A` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#1f2421]">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-[#008751]" />
          <h2 className="text-lg font-medium text-[#1f2421]">Consumo mensual (kWh)</h2>
        </div>

        <div className="flex items-end gap-6 h-56">
          {mockChart.map(({ mes, consumo }) => (
            <div key={mes} className="flex flex-col items-center justify-end flex-1 h-full">
              <span className="text-xs text-slate-500 mb-2">{consumo}</span>
              <div
                className="w-full max-w-[48px] bg-[#008751] rounded-t-md transition-all"
                style={{ height: `${(consumo / maxConsumo) * 100}%` }}
              />
              <span className="text-sm text-slate-600 mt-2">{mes}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
