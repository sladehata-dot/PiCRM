import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

interface Suburb {
  name: string;
  postcode: string;
  x: number;
  y: number;
  isHighlighted?: boolean;
}

const ServiceAreaMap: React.FC = () => {
  const [hoveredSuburb, setHoveredSuburb] = useState<string | null>(null);

  // Major suburbs in the service area with approximate positions
  // Extended from Brisbane CBD to Currumbin/Tugun
  const suburbs: Suburb[] = [
    // Brisbane CBD & Inner Suburbs
    { name: 'Brisbane CBD', postcode: '4000', x: 80, y: 25, isHighlighted: true },
    { name: 'South Brisbane', postcode: '4101', x: 95, y: 45, isHighlighted: true },
    { name: 'Woolloongabba', postcode: '4102', x: 110, y: 60, isHighlighted: true },
    // Southern Brisbane Corridor
    { name: 'Eight Mile Plains', postcode: '4113', x: 100, y: 95, isHighlighted: true },
    { name: 'Springwood', postcode: '4127', x: 90, y: 125, isHighlighted: true },
    { name: 'Logan Central', postcode: '4114', x: 85, y: 150, isHighlighted: true },
    { name: 'Beenleigh', postcode: '4207', x: 95, y: 180, isHighlighted: true },
    // Gold Coast
    { name: 'Coomera', postcode: '4209', x: 120, y: 215, isHighlighted: true },
    { name: 'Helensvale', postcode: '4212', x: 135, y: 245, isHighlighted: true },
    { name: 'Southport', postcode: '4215', x: 165, y: 275, isHighlighted: true },
    { name: 'Surfers Paradise', postcode: '4217', x: 185, y: 305, isHighlighted: true },
    { name: 'Broadbeach', postcode: '4218', x: 180, y: 335, isHighlighted: true },
    { name: 'Burleigh Heads', postcode: '4220', x: 170, y: 370, isHighlighted: true },
    { name: 'Palm Beach', postcode: '4221', x: 160, y: 400, isHighlighted: true },
    { name: 'Currumbin', postcode: '4223', x: 145, y: 430, isHighlighted: true },
    { name: 'Tugun', postcode: '4224', x: 130, y: 455, isHighlighted: true },
    { name: 'Coolangatta', postcode: '4225', x: 115, y: 480, isHighlighted: false },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Map container */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-600 p-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-medium text-white">Pi Energy Service Area</h4>
        </div>
        
        <svg 
          viewBox="0 0 280 520" 
          className="w-full h-auto"
          style={{ maxHeight: '400px' }}
        >
          {/* Background */}
          <rect x="0" y="0" width="280" height="520" fill="#1e293b" rx="8" />
          
          {/* Ocean/Water - Extended for Brisbane */}
          <path
            d="M200 0 L280 0 L280 520 L100 520 L110 480 L125 440 L145 400 L165 360 L185 320 L195 280 L200 240 L205 200 L210 160 L215 120 L220 80 L225 40 L230 0"
            fill="#0c4a6e"
            opacity="0.5"
          />
          
          {/* Brisbane River */}
          <path
            d="M40 30 Q60 35 75 30 Q90 25 100 35 Q110 45 95 50 Q80 55 70 50"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            opacity="0.4"
          />
          
          {/* Service area highlight - Brisbane CBD to Gold Coast corridor */}
          <path
            d="M50 10 
               L140 10 
               L160 30 
               L175 60 
               L185 100 
               L190 150 
               L195 200 
               L200 250 
               L200 300 
               L195 350 
               L185 400 
               L170 440 
               L150 470 
               L120 490 
               L80 490 
               L50 460 
               L40 420 
               L35 370 
               L35 320 
               L40 270 
               L40 220 
               L40 170 
               L40 120 
               L45 70 
               L50 30 
               Z"
            fill="url(#serviceAreaGradient)"
            stroke="#22d3ee"
            strokeWidth="2"
            opacity="0.6"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="serviceAreaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#0891b2" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0.4" />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Main highway/road line - M1/M3 Corridor */}
          <path
            d="M80 20 L90 50 L95 90 L95 130 L90 170 L100 210 L115 250 L135 290 L155 330 L165 370 L160 410 L145 450 L125 485"
            fill="none"
            stroke="#475569"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Coastline - Extended */}
          <path
            d="M220 0 L225 40 L230 80 L230 120 L225 160 L220 200 L210 240 L200 280 L195 320 L185 360 L175 400 L160 440 L145 480 L130 520"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
          
          {/* Suburb markers */}
          {suburbs.map((suburb) => (
            <g 
              key={suburb.postcode}
              onMouseEnter={() => setHoveredSuburb(suburb.name)}
              onMouseLeave={() => setHoveredSuburb(null)}
              className="cursor-pointer"
            >
              {/* Marker glow effect */}
              {suburb.isHighlighted && (
                <circle
                  cx={suburb.x}
                  cy={suburb.y}
                  r={hoveredSuburb === suburb.name ? 14 : 10}
                  fill="#22d3ee"
                  opacity={hoveredSuburb === suburb.name ? 0.4 : 0.2}
                  className="transition-all duration-200"
                />
              )}
              
              {/* Marker dot */}
              <circle
                cx={suburb.x}
                cy={suburb.y}
                r={hoveredSuburb === suburb.name ? 6 : 4}
                fill={suburb.isHighlighted ? '#22d3ee' : '#94a3b8'}
                stroke={suburb.isHighlighted ? '#fff' : '#64748b'}
                strokeWidth="1.5"
                filter={hoveredSuburb === suburb.name ? 'url(#glow)' : undefined}
                className="transition-all duration-200"
              />
              
              {/* Suburb label */}
              <text
                x={suburb.x + 10}
                y={suburb.y + 4}
                fill={hoveredSuburb === suburb.name ? '#22d3ee' : (suburb.isHighlighted ? '#e2e8f0' : '#94a3b8')}
                fontSize="8"
                fontWeight={hoveredSuburb === suburb.name ? '600' : '400'}
                className="transition-all duration-200 pointer-events-none"
              >
                {suburb.name}
              </text>
              
              {/* Postcode on hover */}
              {hoveredSuburb === suburb.name && (
                <text
                  x={suburb.x + 10}
                  y={suburb.y + 13}
                  fill="#94a3b8"
                  fontSize="7"
                  className="pointer-events-none"
                >
                  {suburb.postcode}
                </text>
              )}
            </g>
          ))}
          
          {/* North indicator */}
          <g transform="translate(25, 30)">
            <circle cx="0" cy="0" r="12" fill="#334155" stroke="#475569" strokeWidth="1" />
            <text x="0" y="4" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">N</text>
            <path d="M0 -8 L0 -16" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
          </g>
          
          {/* Arrow marker definition */}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#94a3b8" />
            </marker>
          </defs>
          
          {/* Labels */}
          <text x="240" y="200" fill="#0ea5e9" fontSize="10" fontWeight="500" opacity="0.7">Pacific</text>
          <text x="240" y="212" fill="#0ea5e9" fontSize="10" fontWeight="500" opacity="0.7">Ocean</text>
          
          {/* Brisbane River label */}
          <text x="45" y="65" fill="#38bdf8" fontSize="7" opacity="0.6">Brisbane River</text>
          
          {/* Region labels */}
          <g>
            <rect x="15" y="5" width="55" height="16" rx="3" fill="#0891b2" opacity="0.3" />
            <text x="42" y="16" fill="#22d3ee" fontSize="8" textAnchor="middle" fontWeight="500">BRISBANE</text>
          </g>
          
          <g>
            <rect x="130" y="260" width="60" height="16" rx="3" fill="#0891b2" opacity="0.3" />
            <text x="160" y="271" fill="#22d3ee" fontSize="8" textAnchor="middle" fontWeight="500">GOLD COAST</text>
          </g>
          
          <g>
            <rect x="85" y="495" width="50" height="16" rx="3" fill="#0891b2" opacity="0.3" />
            <text x="110" y="506" fill="#22d3ee" fontSize="8" textAnchor="middle" fontWeight="500">SOUTH</text>
          </g>
        </svg>
        
        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-400 border border-white/50" />
              <span className="text-slate-300">Service Area</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-400 border border-slate-500" />
              <span className="text-slate-400">Coming Soon</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-slate-500 rounded" />
              <span className="text-slate-400">M1/M3 Corridor</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Brisbane CBD to Tugun/Currumbin</p>
        </div>
      </div>
      
      {/* Hovered suburb info tooltip */}
      {hoveredSuburb && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full bg-slate-700 px-3 py-1.5 rounded-lg shadow-lg border border-slate-600 z-10">
          <p className="text-cyan-400 font-medium text-sm">{hoveredSuburb}</p>
          <p className="text-slate-400 text-xs">
            {suburbs.find(s => s.name === hoveredSuburb)?.isHighlighted 
              ? 'Pi Energy Available' 
              : 'Coming Soon'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ServiceAreaMap;
