import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface OrdersByHourChartProps {
  data: { hour: number; count: number }[];
  peakHour: number;
}

export default function OrdersByHourChart({ data, peakHour }: OrdersByHourChartProps) {
  const chartData = data.map(d => ({
    ...d,
    label: `${d.hour}:00`,
    fullLabel: `${d.hour}:00 - ${d.hour === 23 ? '00:00' : `${d.hour + 1}:00`}`
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
        No hourly data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid 
          strokeDasharray="4 4" 
          vertical={false} 
          stroke="rgba(0,0,0,0.03)" 
        />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          interval={3}
          tickFormatter={(v) => `${v}h`}
          dy={10}
        />
        <YAxis
          tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(0,0,0,0.02)' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              return (
                <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 min-w-[120px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">{d.fullLabel}</p>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-bold text-slate-600">Orders</span>
                    <span className="text-sm font-black text-[#212282]">
                      {d.count}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar 
          dataKey="count" 
          radius={[4, 4, 0, 0]} 
          barSize={16}
        >
          {chartData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.hour === peakHour ? '#F05223' : '#e2e8f0'} 
              className="transition-all duration-300 hover:opacity-80"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
