"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface CategoriaDatum {
  nombre: string;
  monto: number;
}

export default function GraficoCategorias({
  data,
}: {
  data: CategoriaDatum[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#475569]">
        Sin movimientos en el período para graficar.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
      <p className="mb-4 text-sm font-medium text-[#0F172A]">Por categoría</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: "#475569" }} />
          <YAxis
            tick={{ fontSize: 12, fill: "#475569" }}
            tickFormatter={(v: number) => v.toLocaleString("es-CL")}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              backgroundColor: "#FFFFFF",
            }}
            formatter={(value) => [
              `$ ${Number(value).toLocaleString("es-CL")}`,
              "Monto",
            ]}
          />
          <Bar dataKey="monto" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
