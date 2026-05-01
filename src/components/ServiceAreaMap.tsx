import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

const ServiceAreaMap: React.FC = () => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const regions = [
    {
      id: 'brisbane',
      label: 'Brisbane & Gold Coast',
      postcodes: '4000 – 4230',
      y: 80,
      dotY: 100,
      active: true,
    },
    {
      id: 'newcastle',
      label: 'Newcastle & Hunter Valley',
      postcodes: '2259 – 2340',
      y: 230,
      dotY: 250,
      active: true,
    },
    {
      id: 'sydney',
      label: 'Sydney Metro',
      postcodes: '2000 – 2250',
      y: 370,
      dotY: 390,
      active: true,
    },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-medium text-white">Pi Energy Service Area</h4>
        </div>

        <svg viewBox="0 0 280 500" className="w-full h-auto" style={{ maxHeight: '380px' }}>
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.15" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <rect width="280" height="500" fill="url(#bg)" rx="8" />

          {/* East coast outline — schematic */}
          <path
            d="M160 10 C165 40 168 70 162 100 C156 130 150 160 148 190 C146 220 148 250 145 280 C142 310 138 340 136 370 C134 400 136 430 138 460 L138 495"
            fill="none"
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.6"
          />

          {/* Ocean label */}
          <text x="190" y="260" fill="#0ea5e9" fontSize="9" opacity="0.5">Pacific</text>
          <text x="190" y="272" fill="#0ea5e9" fontSize="9" opacity="0.5">Ocean</text>

          {/* Connector line between regions */}
          <line x1="72" y1="115" x2="72" y2="235" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <line x1="72" y1="265" x2="72" y2="375" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

          {/* Region cards */}
          {regions.map((r) => {
            const hovered = hoveredRegion === r.id;
            return (
              <g
                key={r.id}
                onMouseEnter={() => setHoveredRegion(r.id)}
                onMouseLeave={() => setHoveredRegion(null)}
                className="cursor-pointer"
              >
                {/* Card background */}
                <rect
                  x="20" y={r.y}
                  width="145" height="52"
                  rx="6"
                  fill={hovered ? 'url(#activeGrad)' : '#1e293b'}
                  stroke={hovered ? '#22d3ee' : '#334155'}
                  strokeWidth={hovered ? 1.5 : 1}
                />

                {/* Active dot */}
                <circle
                  cx="72" cy={r.dotY}
                  r={hovered ? 7 : 5}
                  fill="#22d3ee"
                  opacity={hovered ? 0.9 : 0.7}
                  filter={hovered ? 'url(#glow)' : undefined}
                />
                <circle
                  cx="72" cy={r.dotY}
                  r={hovered ? 13 : 9}
                  fill="#22d3ee"
                  opacity="0.12"
                />

                {/* Text */}
                <text x="90" y={r.y + 20} fill={hovered ? '#22d3ee' : '#e2e8f0'} fontSize="9" fontWeight="600">
                  {r.label}
                </text>
                <text x="90" y={r.y + 34} fill="#64748b" fontSize="8">
                  Postcodes: {r.postcodes}
                </text>
                <text x="90" y={r.y + 45} fill="#22d3ee" fontSize="7" opacity="0.8">
                  ● Active
                </text>
              </g>
            );
          })}

          {/* North indicator */}
          <g transform="translate(240, 30)">
            <circle cx="0" cy="0" r="12" fill="#334155" stroke="#475569" strokeWidth="1" />
            <text x="0" y="4" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">N</text>
          </g>

          {/* State labels */}
          <text x="170" y="100" fill="#94a3b8" fontSize="8" opacity="0.5">QLD</text>
          <text x="170" y="260" fill="#94a3b8" fontSize="8" opacity="0.5">NSW</text>
          <text x="170" y="395" fill="#94a3b8" fontSize="8" opacity="0.5">NSW</text>
        </svg>

        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-400 border border-white/50" />
              <span className="text-slate-300">Active Service Area</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-slate-500 rounded border-dashed" />
              <span className="text-slate-400">East Coast Corridor</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">QLD + NSW — 3 regions active</p>
        </div>
      </div>
    </div>
  );
};

export default ServiceAreaMap;
