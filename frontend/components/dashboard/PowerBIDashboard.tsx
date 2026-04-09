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

// Types
interface CatalogoRow { catalogo: string; ordenes: number; monto: number; percent: number }
interface MonthlyRow { mes: string; ordenes: number; monto: number }
interface DeptRow { nombre: string; ordenes: number; monto: number }
interface TipoRow { tipo: string; monto: number; color: string }
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

function fmtMonto(n = 0) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMillones(n = 0) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} mil M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
  return String(n);
}

export default function PowerBIDashboard() {
  const [filters, setFilters] = useState<Record<string, string>>({
    anio: "", trimestre: "", mes: "", departamento: "", catalogo: "", acuerdo_marco: "", tipo_compra: "",
  });

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: queryKeys.dashboard(filters),
    queryFn: async () => {
      const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "")).toString();
      return apiClient.get(`/api/v1/reportes${params ? "?" + params : ""}`);
    },
    staleTime: 60_000,
  });

  const opts: FilterOptions = data?.filter_options ?? {
    anios: [], trimestres: ["1","2","3","4"],
    meses: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
    departamentos: [], catalogos: [], acuerdos_marco: [], tipos_compra: [],
  };

  function setFilter(k: string, v: string) { setFilters(prev => ({ ...prev, [k]: v })); }
  function resetFilters() { setFilters({ anio: "", trimestre: "", mes: "", departamento: "", catalogo: "", acuerdo_marco: "", tipo_compra: "" }); }

  const colDefs: ColDef[] = useMemo(() => [
    { headerName: "Catálogo", field: "catalogo", flex: 3, filter: true },
    { headerName: "Órdenes", field: "ordenes", width: 120, cellClass: "text-right", valueFormatter: (p:any) => Number(p.value).toLocaleString("es-PE") },
    { headerName: "Monto", field: "monto", flex: 2, cellClass: "text-right", valueFormatter: (p:any) => fmtMonto(p.value) },
    { headerName: "%", field: "percent", width: 90, cellClass: "text-right" },
  ], [data?.total_monto]);

  const catalogos = data?.catalogos ?? [];
  const mensual = data?.mensual ?? [];
  const deptos = data?.departamentos ?? [];
  const tipos = data?.tipos_compra ?? [];
  const maxDeptMonto = Math.max(...deptos.map(d => d.monto), 1);

  return (
    <div className="flex flex-col h-full w-full bg-[#f4f4f4]">
      <div className="h-11 bg-white flex items-center justify-between px-6 border-b">
        <ArrowLeft />
        <h2 className="font-bold text-sm">CONTRATACIONES POR DEPARTAMENTO</h2>
        <ArrowRight />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 bg-white p-3 border-r space-y-2">
          <div className="flex items-center justify-between">
            <strong className="text-xs text-gray-600">Filtros</strong>
            <button onClick={resetFilters} className="text-gray-400"><RotateCcw /></button>
          </div>
          <SelectFilter label="Año" value={filters.anio} onChange={v => setFilter("anio", v)} options={opts.anios} />
          <SelectFilter label="Trimestre" value={filters.trimestre} onChange={v => setFilter("trimestre", v)} options={opts.trimestres} />
          <SelectFilter label="Mes" value={filters.mes} onChange={v => setFilter("mes", v)} options={opts.meses} />
          <SelectFilter label="Departamento" value={filters.departamento} onChange={v => setFilter("departamento", v)} options={opts.departamentos} />
          <SelectFilter label="Catálogo" value={filters.catalogo} onChange={v => setFilter("catalogo", v)} options={opts.catalogos} />
          <SelectFilter label="Acuerdo Marco" value={filters.acuerdo_marco} onChange={v => setFilter("acuerdo_marco", v)} options={opts.acuerdos_marco} />
          <SelectFilter label="Tipo de Compra" value={filters.tipo_compra} onChange={v => setFilter("tipo_compra", v)} options={opts.tipos_compra} />
        </aside>

        <main className="flex-1 p-3 grid grid-cols-12 gap-3">
          <section className="col-span-12 lg:col-span-4 bg-white p-3 rounded shadow">
            <h3 className="text-xs text-center text-[#004696] font-semibold">Monto contratado por departamento</h3>
            <div className="mt-2 space-y-2 max-h-64 overflow-auto">
              {isLoading ? (
                Array.from({length:6}).map((_,i)=>(<div key={i} className="h-5 bg-gray-100 animate-pulse rounded"/>))
              ) : (
                deptos.map(d => (
                  <div key={d.nombre} className="flex items-center gap-2">
                    <div className="w-28 text-xs truncate">{d.nombre}</div>
                    <div className="flex-1 bg-gray-100 h-3 rounded overflow-hidden">
                      <div style={{width: `${(d.monto/maxDeptMonto)*100}%`}} className="h-full bg-[#01B8AA]" />
                    </div>
                    <div className="w-20 text-right text-xs">{fmtMillones(d.monto)}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="col-span-12 lg:col-span-8 bg-white p-2 rounded shadow">
            <h3 className="text-xs text-center text-[#004696] font-semibold">Número de órdenes y Monto por Catálogo</h3>
            <div className="ag-theme-alpine h-72 mt-2">
              <AgGridReact columnDefs={colDefs} rowData={catalogos} headerHeight={28} rowHeight={28} />
            </div>
            <div className="flex justify-end gap-4 text-sm font-bold mt-2">
              <div>{(data?.total_ordenes ?? 0).toLocaleString('es-PE')}</div>
              <div>{fmtMonto(data?.total_monto ?? 0)}</div>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-4 bg-white p-3 rounded shadow">
            <h3 className="text-xs text-center text-[#004696] font-semibold">Monto por tipo de compra</h3>
            <div className="flex items-center mt-2 gap-3">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={tipos} dataKey="monto" innerRadius={32} outerRadius={56}>
                    {tipos.map((t,i)=>(<Cell key={i} fill={t.color}/>))}
                  </Pie>
                  <Tooltip formatter={(v:number)=>fmtMillones(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1">
                {tipos.map(t=> (
                  <div key={t.tipo} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span style={{width:10,height:10,background:t.color}} className="rounded-sm"/> {t.tipo}</div>
                    <div>{fmtMillones(t.monto)}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-4 bg-white p-3 rounded shadow">
            <h3 className="text-xs text-center text-[#004696] font-semibold">Número de órdenes por meses</h3>
            <div className="h-48 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensual}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{fontSize:10}} />
                  <YAxis tickFormatter={fmtMillones} />
                  <Tooltip />
                  <Bar dataKey="ordenes" fill="#01B8AA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-4 bg-white p-3 rounded shadow">
            <h3 className="text-xs text-center text-[#004696] font-semibold">Monto contratado por meses</h3>
            <div className="h-48 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mensual}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{fontSize:10}} />
                  <YAxis tickFormatter={fmtMillones} />
                  <Tooltip formatter={(v:number)=>fmtMonto(v)} />
                  <Bar dataKey="monto" fill="#01B8AA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SelectFilter({ label, value, onChange, options } : { label: string; value?: string; onChange?: (v:string)=>void; options: string[] }){
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-gray-700 uppercase">{label}</label>
      <select value={value} onChange={e=>onChange?.(e.target.value)} className="p-1 border rounded text-sm">
        <option value="">Todas</option>
        {options.map(o=> <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
