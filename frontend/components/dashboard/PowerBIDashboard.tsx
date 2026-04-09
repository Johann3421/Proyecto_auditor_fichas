"use client";

import React, { useMemo } from "react";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
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

ModuleRegistry.registerModules([AllCommunityModule]);

// Data Mocks para emular la vista real de PeruCompras en PowerBI
const mapData = [
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
