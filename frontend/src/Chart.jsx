import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Illustration } from "./components/Brand";
import { ChartNoAxesCombined } from "lucide-react";
export default function Chart({
  title,
  description,
  data,
  line = false,
  onSelect,
  unit = "",
  valueKey = "count",
}) {
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
        <div
          role="group"
          aria-label={
            title +
            ": " +
            data
              .map((item) => item._id + ": " + item[valueKey] + unit)
              .join(", ")
          }
          style={{ width: "100%", height: 220 }}
        >
          <ResponsiveContainer>
            <>
              {line ? (
                <LineChart data={data}>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="_id"
                    tickFormatter={(value) =>
                      String(value).length > 14
                        ? String(value).slice(0, 12) + "…"
                        : value
                    }
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={unit === "%"}
                    domain={unit === "%" ? [0, 100] : [0, "auto"]}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      value + unit,
                      unit === "%" ? "Percentage" : "Records",
                    ]}
                    contentStyle={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                    cursor={{ fill: "var(--accent-soft)" }}
                  />
                  <Line
                    type="linear"
                    isAnimationActive={false}
                    dataKey={valueKey}
                    stroke="var(--accent)"
                    strokeWidth={3}
                  />
                </LineChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="_id"
                    tickFormatter={(value) =>
                      String(value).length > 14
                        ? String(value).slice(0, 12) + "…"
                        : value
                    }
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                  />
                  <YAxis
                    allowDecimals={unit === "%"}
                    domain={unit === "%" ? [0, 100] : [0, "auto"]}
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      value + unit,
                      unit === "%" ? "Percentage" : "Records",
                    ]}
                    contentStyle={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                    cursor={{ fill: "var(--accent-soft)" }}
                  />
                  <Bar
                    dataKey={valueKey}
                    fill="var(--accent)"
                    isAnimationActive={false}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={44}
                  >
                    {data.map((item, index) => (
                      <Cell
                        key={String(item._id) + index}
                        fill={
                          [
                            "var(--accent)",
                            "var(--spectrum-blue)",
                            "var(--mint)",
                            "var(--spectrum-rose)",
                            "var(--spectrum-cyan)",
                          ][index % 5]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty">
          <Illustration kind="reports" />
          <h3>No data yet</h3>
          <p>This chart will populate when records are added.</p>
        </div>
      )}
      {data?.length > 0 && (
        <details className="chart-data">
          <summary>View data{onSelect ? " & explore records" : ""}</summary>
          <div>
            {data.map((item, index) => (
              <div className="chart-data-row" key={String(item._id) + index}>
                {onSelect ? (
                  <button onClick={() => onSelect(item._id)}>{item._id}</button>
                ) : (
                  <span>{item._id}</span>
                )}
                <strong>
                  {Number(item[valueKey]).toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}
                  {unit}
                </strong>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
