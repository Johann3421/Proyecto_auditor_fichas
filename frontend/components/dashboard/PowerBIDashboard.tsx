"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Download, RotateCcw } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Treemap,
} from "recharts";
import * as XLSX from "xlsx";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Types ────────────────────────────────────────────────────────────────────
interface CatalogoRow { catalogo: string; ordenes: number; monto: number; percent: number }
interface MonthlyRow  { mes: string; ordenes: number; monto: number }
interface DeptRow     { nombre: string; ordenes: number; monto: number }
interface TipoRow     { tipo: string; monto: number; color: string }
interface FilterOptions {
  anios: string[]; trimestres: string[]; meses: string[];
  departamentos: string[]; catalogos: string[]; categorias: string[];
  acuerdos_marco: string[]; tipos_compra: string[];
}
interface DashboardData {
  catalogos: CatalogoRow[];
  mensual: MonthlyRow[];
  departamentos: DeptRow[];
  tipos_compra: TipoRow[];
  top_categorias: CatalogoRow[];
  total_ordenes: number;
  total_monto: number;
  filter_options: FilterOptions;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtMonto(n = 0) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n = 0) { return n.toLocaleString("es-PE"); }

function exportToExcel(data: DashboardData) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.json_to_sheet(data.catalogos.map(r => ({
      "Catálogo": r.catalogo, "Fichas": r.ordenes, "%": r.percent,
    }))), "Catálogos");
  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.json_to_sheet(data.mensual.map(r => ({
      "Período": r.mes, "Fichas publicadas": r.ordenes,
    }))), "Por Período");
  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.json_to_sheet(data.departamentos.map(r => ({
      "Región": r.nombre, "Órdenes": r.ordenes, "Monto": r.monto,
    }))), "Por Región");
  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.json_to_sheet(data.tipos_compra.map(r => ({
      "Estado": r.tipo, "Fichas": r.monto,
    }))), "Estados");
  XLSX.writeFile(wb, `ceam-catalogo-${new Date().toISOString().split("T")[0]}.xlsx`);
}

// ── Treemap custom cell renderer ───────────────────────────────────────────
const TREE_COLORS = [
  "#01B8AA","#374649","#FD625E","#F2C80F","#5F6B6D",
  "#8B5CF6","#EC4899","#F97316","#10B981","#3B82F6",
];

function TreemapCell(props: any) {
  const { x, y, width, height, name, value, index } = props;
  if (!width || !height || width < 2 || height < 2) return null;
  const fill = TREE_COLORS[index % TREE_COLORS.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#fff" strokeWidth={2} rx={2} />
      {width > 55 && height > 26 && (
        <text x={x + 5} y={y + 14} fill="#fff" fontSize={9} fontWeight={600}>
          {String(name).length > 22 ? String(name).substring(0, 20) + "…" : name}
        </text>
      )}
      {width > 55 && height > 38 && (
        <text x={x + 5} y={y + 26} fill="#ffffffcc" fontSize={9}>
          {Number(value).toLocaleString("es-PE")} fichas
        </text>
      )}
    </g>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function PowerBIDashboard() {
  const [filters, setFilters] = useState<Record<string, string>>({
    anio: "", catalogo: "", categoria: "", departamento: "", acuerdo_marco: "", tipo_compra: "",
  });

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: queryKeys.dashboard(filters),
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== "")
      ).toString();
      return apiClient.get(`/api/v1/reportes${params ? "?" + params : ""}`);
    },
    staleTime: 60_000,
  });

  const opts: FilterOptions = data?.filter_options ?? {
    anios: [], trimestres: [], meses: [], departamentos: [],
    catalogos: [], categorias: [], acuerdos_marco: [], tipos_compra: [],
  };

  function setFilter(k: string, v: string) { setFilters(prev => ({ ...prev, [k]: v })); }
  function resetFilters() { setFilters({ anio: "", catalogo: "", categoria: "", departamento: "", acuerdo_marco: "", tipo_compra: "" }); }

  const colDefs: ColDef[] = useMemo(() => [
    { headerName: "Catálogo", field: "catalogo", flex: 3, filter: true },
    { headerName: "Fichas", field: "ordenes", width: 110, cellClass: "text-right",
      valueFormatter: (p: any) => fmtNum(p.value) },
    { headerName: "Monto", field: "monto", flex: 2, cellClass: "text-right",
      valueFormatter: (p: any) => fmtMonto(p.value) },
    { headerName: "%", field: "percent", width: 80, cellClass: "text-right" },
  ], []);

  const catalogos     = data?.catalogos     ?? [];
  const mensual       = data?.mensual       ?? [];
  const deptos        = data?.departamentos ?? [];
  const tipos         = data?.tipos_compra  ?? [];
  const topCategorias = data?.top_categorias ?? [];
  const totalFichas   = data?.total_ordenes ?? 0;

  const treemapData = catalogos.map(r => ({ name: r.catalogo, size: r.ordenes }));

  return (
    <div className="flex flex-col h-full w-full bg-[#f4f4f4]">
      {/* Header */}
      <div className="h-11 bg-white flex items-center justify-between px-6 border-b">
        <ArrowLeft className="w-4 h-4 cursor-pointer" />
        <h2 className="font-bold text-sm">CATÁLOGO ELECTRÓNICO PERUCOMPRAS — 2025 / 2026</h2>
        <div className="flex items-center gap-3">
          {data && (
            <button
              onClick={() => exportToExcel(data)}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded"
            >
              <Download className="w-3 h-3" />
              Exportar Excel
            </button>
          )}
          <ArrowRight className="w-4 h-4 cursor-pointer" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 bg-white p-3 border-r space-y-2 overflow-y-auto">
          <div className="flex items-center justify-between">
            <strong className="text-xs text-gray-600">Filtros</strong>
            <button onClick={resetFilters} className="text-gray-400 hover:text-gray-600">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <SelectFilter label="Año"           value={filters.anio}          onChange={v => setFilter("anio", v)}          options={opts.anios} />
          <SelectFilter label="Catálogo"      value={filters.catalogo}      onChange={v => setFilter("catalogo", v)}      options={opts.catalogos} />
          <SelectFilter label="Categoría"     value={filters.categoria}     onChange={v => setFilter("categoria", v)}     options={opts.categorias} />
          <SelectFilter label="Región"         value={filters.departamento}  onChange={v => setFilter("departamento", v)}  options={opts.departamentos} />
          <SelectFilter label="Acuerdo Marco"  value={filters.acuerdo_marco} onChange={v => setFilter("acuerdo_marco", v)} options={opts.acuerdos_marco} />
          <SelectFilter label="Estado"         value={filters.tipo_compra}   onChange={v => setFilter("tipo_compra", v)}   options={opts.tipos_compra} />
          <div className="pt-3 border-t space-y-1">
            <div className="text-[11px] text-gray-500">Total fichas</div>
            <div className="text-xl font-bold text-teal-600">{fmtNum(totalFichas)}</div>
          </div>
        </aside>

        {/* Main grid */}
        <main className="flex-1 p-3 grid grid-cols-12 gap-3 overflow-auto">

          {/* Row 1: Top Categorías | Treemap | AG Grid */}
          <section className="col-span-12 lg:col-span-3 bg-white p-3 rounded shadow flex flex-col" style={{ minHeight: 260 }}>
            <h3 className="text-xs text-center text-[#004696] font-semibold mb-1">Top Categorías de Producto</h3>
            {isLoading ? (
              <div className="flex-1 bg-gray-50 animate-pulse rounded" />
            ) : topCategorias.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400">Sin datos</div>
            ) : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topCategorias} layout="vertical" margin={{ left: 4, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 8 }} />
                    <YAxis dataKey="catalogo" type="category" width={110} tick={{ fontSize: 7 }}
                      tickFormatter={(v: string) => v.length > 18 ? v.substring(0, 16) + "…" : v} />
                    <Tooltip formatter={(v: number) => [fmtNum(v), "Fichas"]} />
                    <Bar dataKey="ordenes" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="col-span-12 lg:col-span-4 bg-white p-3 rounded shadow flex flex-col" style={{ minHeight: 260 }}>
            <h3 className="text-xs text-center text-[#004696] font-semibold mb-1">Mapa de Distribución por Catálogo</h3>
            {isLoading ? (
              <div className="flex-1 bg-gray-50 animate-pulse rounded" />
            ) : treemapData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400">Sin datos</div>
            ) : (
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={220}>
                  <Treemap data={treemapData} dataKey="size" stroke="#fff" content={<TreemapCell />}>
                    <Tooltip formatter={(v: number) => [`${fmtNum(v)} fichas`, "Fichas"]} />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="col-span-12 lg:col-span-5 bg-white p-2 rounded shadow flex flex-col" style={{ minHeight: 260 }}>
            <h3 className="text-xs text-center text-[#004696] font-semibold mb-1">Número de fichas por Catálogo</h3>
            <div className="ag-theme-alpine flex-1" style={{ minHeight: 200 }}>
              <AgGridReact columnDefs={colDefs} rowData={catalogos} headerHeight={28} rowHeight={26} />
            </div>
            <div className="flex justify-end gap-4 text-sm font-bold mt-1 pr-1">
              <span>{fmtNum(totalFichas)}</span>
              <span>{fmtMonto(data?.total_monto ?? 0)}</span>
            </div>
          </section>

          {/* Row 2: Pie | Periodo bar | Acuerdo bar */}
          <section className="col-span-12 lg:col-span-4 bg-white p-3 rounded shadow">
            <h3 className="text-xs text-center text-[#004696] font-semibold">Distribución por Estado</h3>
            <div className="flex items-center mt-2 gap-3">
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={tipos} dataKey="monto" innerRadius={30} outerRadius={52}>
                    {tipos.map((t, i) => <Cell key={i} fill={t.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtNum(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {tipos.map(t => (
                  <div key={t.tipo} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: t.color }} />
                      {t.tipo}
                    </div>
                    <div className="font-medium">{fmtNum(t.monto)}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-4 bg-white p-3 rounded shadow">
            <h3 className="text-xs text-center text-[#004696] font-semibold">Fichas publicadas por período (2025–)</h3>
            <div className="h-44 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensual} margin={{ left: 0, right: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 8 }} angle={-35} textAnchor="end" height={42} />
                  <YAxis tick={{ fontSize: 9 }} width={38} />
                  <Tooltip formatter={(v: number) => [fmtNum(v), "Fichas"]} />
                  <Bar dataKey="ordenes" fill="#01B8AA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-4 bg-white p-3 rounded shadow">
            <h3 className="text-xs text-center text-[#004696] font-semibold">Fichas por Departamento de Entrega</h3>
            <div className="h-44 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptos} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis dataKey="nombre" type="category" width={95} tick={{ fontSize: 8 }} />
                  <Tooltip formatter={(v: number) => [fmtNum(v), "Fichas"]} />
                  <Bar dataKey="ordenes" fill="#374649" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

function SelectFilter({ label, value, onChange, options }: {
  label: string; value?: string; onChange?: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[11px] font-medium text-gray-700 uppercase">{label}</label>
      <select
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className="p-1 border rounded text-xs"
      >
        <option value="">Todas</option>
        {(options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
