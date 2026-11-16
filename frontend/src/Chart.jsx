import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { ChartNoAxesCombined } from "lucide-react";
export default function Chart({ title, description, data, line = false }) {
  return (
    <section className="panel chart">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <ChartNoAxesCombined size={18} />
      </div>
      {data?.length ? (
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <>
              {line ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#4f46e5"
                    strokeWidth={3}
                  />
                </LineChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="#6366f1"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              )}
            </>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty">
          <h3>No data yet</h3>
          <p>This chart will populate when records are added.</p>
        </div>
      )}
    </section>
  );
}
