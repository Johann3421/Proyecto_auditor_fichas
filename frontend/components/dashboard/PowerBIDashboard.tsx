"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Types ──────────────────────────────────────────────────────────────────────
interface CatalogoRow  { catalogo: string; ordenes: number; monto: number; percent: number }
interface MonthlyRow   { mes: string; ordenes: number; monto: number }
interface DeptRow      { nombre: string; ordenes: number; monto: number }
interface TipoRow      { tipo: string; monto: number; color: string }
interface FilterOptions {
  anios: string[]; trimestres: string[]; meses: string[];
  departamentos: string[]; catalogos: string[];
  acuerdos_marco: string[]; tipos_compra: string[];
}
interface DashboardData {
  catalogos: CatalogoRow[];
  mensual: MonthlyRow[];
  departamentos: DeptRow[];
  tipos_compra: TipoRow[];
  total_ordenes: number;
  total_monto: number;
  filter_options: FilterOptions;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtMonto(n: number) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMillones(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} mil M`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)} M`;
  return String(n);
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function PowerBIDashboard() {
  const [filters, setFilters] = useState<Record<string, string>>({
    anio: "", trimestre: "", mes: "",
    departamento: "", catalogo: "", acuerdo_marco: "", tipo_compra: "",
  });

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: queryKeys.dashboard(filters),
    queryFn: () => {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v !== "")
      ).toString();
      return apiClient.get(`/api/v1/reportes${params ? "?" + params : ""}`);
    },
    staleTime: 60_000,
  });

  const opts: FilterOptions = data?.filter_options ?? {
    anios: [], trimestres: ["1","2","3","4"],
    meses: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
    departamentos: [], catalogos: [], acuerdos_marco: [], tipos_compra: [],
  };

  function setFilter(key: string, val: string) {
    setFilters(prev => ({ ...prev, [key]: val }));
  }
  function resetFilters() {
    setFilters({ anio: "", trimestre: "", mes: "", departamento: "", catalogo: "", acuerdo_marco: "", tipo_compra: "" });
  }

  // ── AG-Grid columns ────────────────────────────────────────────────────────
  const colDefs: ColDef[] = useMemo(() => [
    {
      headerName: "Catálogos Electrónicos", field: "catalogo", flex: 3,
      filter: "agTextColumnFilter",
      cellStyle: { fontSize: "11px" },
    },
    {
      headerName: "Nro Ordenes", field: "ordenes", width: 120,
      cellClass: "text-right",
      cellStyle: { fontSize: "11px" },
      valueFormatter: (p: any) => Number(p.value).toLocaleString("es-PE"),
    },
    {
      headerName: "Monto Contratado", field: "monto", flex: 2,
      cellStyle: { fontSize: "11px" },
      cellRenderer: (p: any) => (
        <div className="relative h-full flex items-center justify-end pr-1">
          <div
            className="absolute left-0 top-1 bottom-1 bg-[#01B8AA] opacity-25 rounded-sm"
            style={{ width: `${Math.min(100, (p.value / (data?.total_monto ?? 1)) * 450)}%` }}
          />
          <span className="relative z-10 text-right">{fmtMonto(p.value)}</span>
        </div>
      ),
    },
    {
      headerName: "% M.C.", field: "percent", width: 80,
      cellClass: "text-right",
      cellStyle: { fontSize: "11px" },
      valueFormatter: (p: any) => `${Number(p.value).toFixed(2)}%`,
    },
  ], [data?.total_monto]);

  const catalogos: CatalogoRow[] = data?.catalogos ?? [];
  const mensual:   MonthlyRow[]  = data?.mensual ?? [];
  const deptos:    DeptRow[]     = data?.departamentos ?? [];
  const tipos:     TipoRow[]     = data?.tipos_compra ?? [];
  const maxDeptMonto = Math.max(...deptos.map(d => d.monto), 1);

  return (
    <div className="flex flex-col h-full w-full bg-[#f4f4f4] font-sans overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="h-11 bg-white flex items-center justify-between px-6 border-b border-gray-200 shrink-0 shadow-sm">
        <ArrowLeft className="text-gray-400 w-5 h-5 cursor-pointer hover:text-[#01B8AA] transition-colors" />
        <h1 className="text-sm font-bold text-gray-700 tracking-widest uppercase">
          CONTRATACIONES POR DEPARTAMENTO
        </h1>
        <ArrowRight className="text-gray-400 w-5 h-5 cursor-pointer hover:text-[#01B8AA] transition-colors" />
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar Filters ─────────────────────────────────────────────── */}
        <aside className="w-52 bg-white border-r border-gray-200 flex flex-col gap-3 p-3 shrink-0 overflow-y-auto shadow-sm z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Filtros</span>
            <button onClick={resetFilters} title="Limpiar filtros"
              className="text-gray-400 hover:text-[#01B8AA] transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <SelectFilter label="Año"               value={filters.anio}         onChange={v => setFilter("anio", v)}          options={opts.anios} />
          <SelectFilter label="Trimestre"          value={filters.trimestre}    onChange={v => setFilter("trimestre", v)}     options={opts.trimestres} />
          <SelectFilter label="Mes"                value={filters.mes}          onChange={v => setFilter("mes", v)}           options={opts.meses} />
          <SelectFilter label="Departamento"       value={filters.departamento} onChange={v => setFilter("departamento", v)} options={opts.departamentos} />
          <SelectFilter label="Catálogo Electrónico" value={filters.catalogo}  onChange={v => setFilter("catalogo", v)}      options={opts.catalogos} />
          <SelectFilter label="Acuerdo Marco"      value={filters.acuerdo_marco} onChange={v => setFilter("acuerdo_marco", v)} options={opts.acuerdos_marco} />
          <SelectFilter label="Tipo de Compra"     value={filters.tipo_compra}  onChange={v => setFilter("tipo_compra", v)}  options={opts.tipos_compra} />
        </aside>

        {/* ── Main ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-2 grid grid-cols-12 grid-rows-[auto_1fr_220px] gap-2">

          {/* ── Departamentos (col 1-4, rows 1-2) ─────────────────── */}
          <div className="col-span-12 xl:col-span-4 row-span-2 bg-white shadow-sm border border-gray-100 flex flex-col overflow-hidden rounded-sm">
            <h3 className="text-[#004696] text-center font-semibold text-xs py-2 border-b border-gray-100 shrink-0">
              Monto contratado por departamento
            </h3>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-7 bg-gray-100 animate-pulse rounded" />
                  ))
                : deptos.map((d) => (
                    <div key={d.nombre}
                      className="flex items-center gap-2 cursor-pointer hover:bg-[#f0fafb] rounded px-1 py-0.5 transition-colors group"
                      onClick={() => setFilter("departamento", filters.departamento === d.nombre ? "" : d.nombre)}
                    >
                      <span className={`text-[10px] w-28 shrink-0 truncate font-medium ${filters.departamento === d.nombre ? "text-[#01B8AA]" : "text-gray-700"}`}>
                        {d.nombre}
                      </span>
                      <div className="flex-1 bg-gray-100 h-3.5 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-[#01B8AA] rounded-sm transition-all"
                          style={{ width: `${(d.monto / maxDeptMonto) * 100}%`, opacity: filters.departamento === d.nombre ? 1 : 0.7 }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-500 w-16 text-right shrink-0">
                        {fmtMillones(d.monto)}
                      </span>
                    </div>
                  ))
              }
            </div>
            <p className="text-[10px] text-center text-gray-400 py-1.5 italic border-t border-gray-100 shrink-0">
              Haga clic en un departamento para filtrar
            </p>
          </div>

          {/* ── Tabla Catálogos (col 5-12, rows 1-2) ─────────────── */}
          <div className="col-span-12 xl:col-span-8 row-span-2 bg-white shadow-sm border border-gray-100 flex flex-col overflow-hidden rounded-sm">
            <h3 className="text-[#004696] text-center font-semibold text-xs py-2 border-b border-gray-100 shrink-0">
              Número de órdenes y Monto contratado por Catálogo Electrónico
            </h3>
            <div className="flex-1 ag-theme-alpine w-full min-h-0">
              <AgGridReact
                theme="legacy"
                columnDefs={colDefs}
                rowData={catalogos}
                domLayout="normal"
                headerHeight={28}
                rowHeight={26}
                defaultColDef={{ resizable: true, sortable: true }}
                loadingOverlayComponent={() => (
                  <div className="flex items-center justify-center h-full text-gray-400 text-xs">Cargando...</div>
                )}
                loading={isLoading}
              />
            </div>
            <div className="flex justify-between items-center px-4 py-1 border-t-2 border-[#01B8AA] bg-gray-50 shrink-0">
              <span className="text-xs font-bold text-gray-800">Total</span>
              <div className="flex gap-8 text-xs font-bold text-gray-800">
                <span>{(data?.total_ordenes ?? 0).toLocaleString("es-PE")}</span>
                <span>{fmtMonto(data?.total_monto ?? 0)}</span>
                <span>100,00%</span>
              </div>
            </div>
          </div>

          {/* ── Donut Tipo Compra (row 3, col 1-4) ────────────────── */}
          <div className="col-span-12 xl:col-span-4 bg-white shadow-sm border border-gray-100 flex flex-col overflow-hidden rounded-sm">
            <h3 className="text-[#004696] text-center font-semibold text-xs py-2 border-b border-gray-100 shrink-0">
              Monto contratado por tipo de compra
            </h3>
            <div className="flex-1 min-h-0 flex items-center">
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie data={tipos} cx="50%" cy="50%" innerRadius={40} outerRadius={68}
                    dataKey="monto" stroke="none">
                    {tipos.map((t, i) => (
                      <Cell key={i} fill={t.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtMillones(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-1.5 pr-3">
                {tipos.map((t) => (
                  <div key={t.tipo} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-[10px] text-gray-600 truncate">{t.tipo}</span>
                    <span className="text-[10px] font-semibold text-gray-800 ml-auto shrink-0">
                      {fmtMillones(t.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bar Ordenes/mes (row 3, col 5-8) ──────────────────── */}
          <div className="col-span-12 xl:col-span-4 bg-white shadow-sm border border-gray-100 flex flex-col overflow-hidden rounded-sm">
            <h3 className="text-[#004696] text-center font-semibold text-xs py-2 border-b border-gray-100 shrink-0">
              Número de órdenes por meses
            </h3>
            <div className="flex-1 min-h-0 pl-1 pr-3 pb-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensual} margin={{ top: 4, right: 0, bottom: 24, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="mes" tick={{ fontSize: 9 }}
                    tickFormatter={(v: string) => v.slice(0, 3)}
                    angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 9 }} width={36} tickFormatter={fmtMillones} />
                  <Tooltip
                    formatter={(v: number) => [`${v} mill.`, "Órdenes"]}
                    labelFormatter={(l: string) => l}
                  />
                  <Bar dataKey="ordenes" fill="#01B8AA" barSize={14} radius={[2, 2, 0, 0]}
                    label={{ position: "inside", fill: "#fff", fontSize: 8,
                      formatter: (v: number) => v >= 0.05 ? `${v.toFixed(2)}` : "" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Bar Monto/mes (row 3, col 9-12) ───────────────────── */}
          <div className="col-span-12 xl:col-span-4 bg-white shadow-sm border border-gray-100 flex flex-col overflow-hidden rounded-sm">
            <h3 className="text-[#004696] text-center font-semibold text-xs py-2 border-b border-gray-100 shrink-0">
              Monto contratado por meses
            </h3>
            <div className="flex-1 min-h-0 pl-1 pr-3 pb-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensual} margin={{ top: 4, right: 0, bottom: 24, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="mes" tick={{ fontSize: 9 }}
                    tickFormatter={(v: string) => v.slice(0, 3)}
                    angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 9 }} width={42} tickFormatter={fmtMillones} />
                  <Tooltip
                    formatter={(v: number) => [`${fmtMonto(v)} mill.`, "Monto"]}
                  />
                  <Bar dataKey="monto" fill="#01B8AA" barSize={14} radius={[2, 2, 0, 0]}
                    label={{ position: "inside", fill: "#fff", fontSize: 7,
                      formatter: (v: number) => v >= 500 ? `${(v/1000).toFixed(0)}k` : "" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────────
function SelectFilter({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col gap-0.5 w-full">
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-[11px] p-1 border border-gray-200 rounded shadow-xs
                   focus:outline-none focus:border-[#01B8AA] text-gray-700 bg-white
                   transition-colors"
      >
        <option value="">Todas</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

  { name: "LIMA", value: 14000 },
  { name: "CUSCO", value: 4000 },
  { name: "AREQUIPA", value: 3000 },
  { name: "PIURA", value: 2500 },
  { name: "LA LIBERTAD", value: 2000 },
];

const mockCatalogos = [
  { catalogo: "COMPUTADORAS DE ESCRITORIO", ordenes: 54265, monto: 3189365150.95, percent: "22.53%" },
  { catalogo: "CONSUMIBLES", ordenes: 229804, monto: 1440042526.61, percent: "10.17%" },
  { catalogo: "COMPUTADORAS PORTÁTILES", ordenes: 18489, monto: 1419433724.91, percent: "10.03%" },
  { catalogo: "IMPRESORAS", ordenes: 51873, monto: 1065797064.98, percent: "7.53%" },
  { catalogo: "PAPELES Y CARTONES", ordenes: 153545, monto: 1001272879.20, percent: "7.07%" },
  { catalogo: "ÚTILES DE ESCRITORIO", ordenes: 252021, monto: 593122526.27, percent: "6.32%" },
];

const donutData = [
  { name: "GRAN COMPRA", value: 7000, color: "#00B4A9" },
  { name: "ORDINARIA", value: 6000, color: "#323E48" },
  { name: "BOLETOS AÉREOS", value: 1000, color: "#E03B31" },
];

const barMesesData = [
  { mes: "enero", ordenes: 0.02, monto: 289.57 },
  { mes: "febrero", ordenes: 0.07, monto: 797.96 },
  { mes: "marzo", ordenes: 0.12, monto: 1254.84 },
  { mes: "abril", ordenes: 0.09, monto: 1068.21 },
  { mes: "mayo", ordenes: 0.10, monto: 1095.38 },
  { mes: "junio", ordenes: 0.09, monto: 1024.82 },
  { mes: "julio", ordenes: 0.10, monto: 1084.26 },
  { mes: "agosto", ordenes: 0.09, monto: 1149.67 },
  { mes: "septiembre", ordenes: 0.10, monto: 1276.11 },
  { mes: "octubre", ordenes: 0.11, monto: 1548.41 },
  { mes: "noviembre", ordenes: 0.11, monto: 1725.18 },
  { mes: "diciembre", ordenes: 0.11, monto: 1841.39 },
];

export default function PowerBIDashboard() {
  const tableColDefs: ColDef[] = useMemo(
    () => [
      { headerName: "Catálogos Electrónicos", field: "catalogo", flex: 2, filter: "agTextColumnFilter" },
      { headerName: "Nro Ordenes", field: "ordenes", width: 120, cellClass: "text-right" },
      { 
        headerName: "Monto Contratado", 
        field: "monto", 
        flex: 1.5, 
        cellClass: "text-right font-medium",
        valueFormatter: (p: any) => Number(p.value).toLocaleString("es-PE", { minimumFractionDigits: 2 }),
        cellStyle: { backgroundColor: "#E6F7F6" } 
      },
      { headerName: "% M.C.", field: "percent", width: 100, cellClass: "text-right" },
    ],
    []
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#f2f2f2] font-sans overflow-hidden">
      {/* Header Top - Title Bar */}
      <div className="h-14 bg-white flex items-center justify-between px-6 border-b border-gray-200">
        <ArrowLeft className="text-gray-500 w-6 h-6 cursor-pointer" />
        <h1 className="text-xl font-bold text-gray-700 tracking-wide uppercase">
          CONTRATACIONES POR DEPARTAMENTO
        </h1>
        <ArrowRight className="text-gray-500 w-6 h-6 cursor-pointer" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Filter Column */}
        <div className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 shadow-sm z-10 overflow-auto">
          <div className="flex flex-col gap-1 items-center pb-4 border-b border-gray-100">
            <FilterIcon />
          </div>

          <SelectFilter label="Año" />
          <SelectFilter label="Trimestre" />
          <SelectFilter label="Mes" />
          <SelectFilter label="Departamento" />
          <SelectFilter label="Catálogo Electrónico" />
          <SelectFilter label="Acuerdo Marco" />
          <SelectFilter label="Tipo de Compra" />
        </div>

        {/* Main Reporting Area */}
        <div className="flex-1 p-2 grid grid-cols-12 grid-rows-3 gap-2 overflow-auto">
          
          {/* Top Left: Map Area */}
          <div className="col-span-12 lg:col-span-4 row-span-2 bg-white shadow-sm border border-gray-200 flex flex-col pt-2 relative">
            <h3 className="text-[#0e5c94] text-center font-medium text-sm">
              Monto contratado por departamento
            </h3>
            <div className="flex-1 flex flex-col items-center justify-center relative p-4">
              <div className="text-gray-300 w-full h-full flex flex-col items-center justify-center opacity-40">
                  <MapPin className="w-24 h-24 mb-4 text-[#0e5c94]" />
                  <p className="text-xs text-center px-8">Mapa interactivo del Perú (Recharts Geo / Simple Maps pendiente de API cartográfica)</p>
              </div>
              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-70">
                {mapData.map((d) => (
                  <div key={d.name} className="flex gap-2 items-center text-xs">
                     <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                     <span className="font-semibold text-gray-700 w-20">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-center text-gray-400 pb-2 italic">
              Seleccione el departamento para obtener mayor detalle
            </p>
          </div>

          {/* Top Right: AG Grid Area */}
          <div className="col-span-12 lg:col-span-8 row-span-2 bg-white shadow-sm border border-gray-200 flex flex-col relative pb-2 pt-2">
            <h3 className="text-[#0e5c94] text-center font-medium text-sm mb-2">
              Número de órdenes y Monto contratado por Catálogo Electrónico
            </h3>
            <div className="flex-1 ag-theme-alpine w-full px-2">
              <AgGridReact
                theme="legacy"
                columnDefs={tableColDefs}
                rowData={mockCatalogos}
                rowSelection={{ mode: "singleRow", checkboxes: false, headerCheckbox: false }}
                domLayout="normal"
                headerHeight={32}
                rowHeight={30}
                defaultColDef={{ resizable: true }}
              />
            </div>
            <div className="flex justify-between px-4 pt-1 font-bold text-sm text-gray-800 border-t border-[#00B4A9]">
              <span>Total</span>
              <div className="flex gap-8">
                <span>1.106.038</span>
                <span>14.155.802.998,92</span>
                <span>100,00%</span>
              </div>
            </div>
          </div>

          {/* Bottom Left: Donut Chart */}
          <div className="col-span-12 lg:col-span-4 row-span-1 bg-white shadow-sm border border-gray-200 flex flex-col pt-2 relative">
            <h3 className="text-[#0e5c94] text-center font-medium text-sm">
              Monto contratado por tipo de compra
            </h3>
            <div className="flex-1 w-full h-full relative">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => `S/. ${val}bn`} />
                </PieChart>
              </ResponsiveContainer>
              {/* Central Text Label */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                 <span className="text-xs text-gray-500 font-semibold">Total</span>
                 <span className="text-sm font-bold text-gray-800">14bn</span>
              </div>
            </div>
          </div>

          {/* Bottom Mid: Bar Chart Ordinaria */}
          <div className="col-span-12 lg:col-span-4 row-span-1 bg-white shadow-sm border border-gray-200 flex flex-col pt-2">
            <h3 className="text-[#0e5c94] text-center font-medium text-sm mb-2">
              Número de órdenes por meses
            </h3>
            <div className="flex-1 pr-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barMesesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(0, 3)} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip />
                  <Bar dataKey="ordenes" fill="#00B4A9" barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Right: Bar Chart Monto */}
          <div className="col-span-12 lg:col-span-4 row-span-1 bg-white shadow-sm border border-gray-200 flex flex-col pt-2 pb-6">
             <h3 className="text-[#0e5c94] text-center font-medium text-sm mb-2">
              Monto contratado por meses
            </h3>
            <div className="flex-1 pr-6 relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barMesesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(0, 3)} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip />
                  <Bar dataKey="monto" fill="#00B4A9" barSize={15} />
                </BarChart>
              </ResponsiveContainer>
              <div className="absolute -bottom-6 right-0 text-[10px] text-gray-400 italic">
                Actualizado el {new Date().toLocaleDateString('es-PE')}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Subcomponente Reutilizable
function SelectFilter({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-[11px] font-medium text-gray-700 uppercase tracking-wide">
        {label}
      </label>
      <select className="w-full text-sm p-1.5 border border-gray-300 rounded shadow-sm focus:outline-none focus:border-[#00B4A9] text-gray-600 bg-white">
        <option>Todas</option>
      </select>
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
      <path d="M4 4L10 12V18L14 20V12L20 4H4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
