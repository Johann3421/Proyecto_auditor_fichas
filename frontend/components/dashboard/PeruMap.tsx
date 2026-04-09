"use client";

import React, { useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

// world-atlas countries at 110m resolution — country id 604 = Peru
const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface PeruMapProps {
  totalFichas: number;
  catalogLabel?: string;
}

export function PeruMap({ totalFichas, catalogLabel }: PeruMapProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative flex flex-col items-center h-full">
      <p className="text-[11px] text-gray-500 text-center mb-1">
        <span className="font-bold text-teal-600">{totalFichas.toLocaleString("es-PE")}</span>{" "}
        fichas · {catalogLabel || "Todos los catálogos"} · cobertura nacional
      </p>
      <div className="flex-1 w-full">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [-76, -9], scale: 1350 }}
          width={200}
          height={220}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup zoom={1} center={[-76, -9]}>
            <Geographies geography={WORLD_URL}>
              {({ geographies }) =>
                geographies
                  .filter((g) => String(g.id) === "604")
                  .map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      stroke="#fff"
                      strokeWidth={0.5}
                      style={{
                        default: { fill: "#01B8AA", outline: "none" },
                        hover: { fill: "#00897B", outline: "none" },
                        pressed: { fill: "#00695C", outline: "none" },
                      }}
                      onMouseEnter={() => setHovered(true)}
                      onMouseLeave={() => setHovered(false)}
                    />
                  ))
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
      {hovered && (
        <div className="absolute bottom-2 left-2 bg-white border text-[11px] px-2 py-1 rounded shadow z-10">
          Perú &mdash; {totalFichas.toLocaleString("es-PE")} fichas disponibles
        </div>
      )}
    </div>
  );
}
