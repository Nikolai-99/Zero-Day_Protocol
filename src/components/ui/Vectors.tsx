import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// ==========================================
// VECTORES PARA RANGOS DE OPERADOR (REGLA 4)
// ==========================================

// Rango 1: SCRIPT_ROOKIE (Cadete - Terminal y Chevron Inicial)
export const ScriptRookieIcon: React.FC<IconProps> = ({ className = "w-6 h-6", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <rect x="3" y="4" width="18" height="15" rx="2" strokeOpacity="0.8" />
    <polyline points="7 9 10 12 7 15" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="15" x2="16" y2="15" stroke="currentColor" strokeWidth="2" />
    <path d="M7 21h10" strokeOpacity="0.6" />
  </svg>
);

// Rango 2: VULNERABILITY_HUNTER (Cazador - Radar y Mira Táctica)
export const VulnerabilityHunterIcon: React.FC<IconProps> = ({ className = "w-6 h-6", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <circle cx="12" cy="12" r="9" strokeOpacity="0.8" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" strokeWidth="2" />
    <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
    <line x1="1" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" />
    <line x1="19" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

// Rango 3: SECURITY_SPECIALIST (Especialista - Escudo Fortaleza Firewall)
export const SecuritySpecialistIcon: React.FC<IconProps> = ({ className = "w-6 h-6", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <rect x="9" y="10" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 10V8a2 2 0 1 1 4 0v2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12.5" r="0.8" fill="currentColor" />
  </svg>
);

// Rango 4: ELITE_OPERATOR (Élite - Estrella Diamante y Corona Cibernética)
export const EliteOperatorIcon: React.FC<IconProps> = ({ className = "w-6 h-6", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <polygon
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <circle cx="12" cy="11.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="11.5" r="1" fill="currentColor" />
  </svg>
);

// ==========================================
// VECTORES PARA MODOS DE JUEGO (REGLA 2)
// ==========================================

// Modo NORMAL (Tactical Core / Balance CPU)
export const NormalModeIcon: React.FC<IconProps> = ({ className = "w-6 h-6", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect x="9" y="9" width="6" height="6" fill="currentColor" fillOpacity="0.2" strokeWidth="1.5" />
    <line x1="9" y1="1" x2="9" y2="4" stroke="currentColor" strokeWidth="2" />
    <line x1="15" y1="1" x2="15" y2="4" stroke="currentColor" strokeWidth="2" />
    <line x1="9" y1="20" x2="9" y2="23" stroke="currentColor" strokeWidth="2" />
    <line x1="15" y1="20" x2="15" y2="23" stroke="currentColor" strokeWidth="2" />
    <line x1="20" y1="9" x2="23" y2="9" stroke="currentColor" strokeWidth="2" />
    <line x1="20" y1="15" x2="23" y2="15" stroke="currentColor" strokeWidth="2" />
    <line x1="1" y1="9" x2="4" y2="9" stroke="currentColor" strokeWidth="2" />
    <line x1="1" y1="15" x2="4" y2="15" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Modo HACKING (Terminal Matrix / Code Brackets)
export const HackingModeIcon: React.FC<IconProps> = ({ className = "w-6 h-6", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" />
    <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" />
    <line x1="14" y1="4" x2="10" y2="20" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Modo IMPOSSIBLE (Cyber Skull / Danger Biohazard)
export const ImpossibleModeIcon: React.FC<IconProps> = ({ className = "w-6 h-6", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path
      d="M12 2C7.58 2 4 5.58 4 10c0 3.25 1.95 6.05 4.75 7.25V20c0 .55.45 1 1 1h4.5c.55 0 1-.45 1-1v-2.75C18.05 16.05 20 13.25 20 10c0-4.42-3.58-8-8-8z"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <circle cx="9" cy="10" r="1.8" fill="currentColor" />
    <circle cx="15" cy="10" r="1.8" fill="currentColor" />
    <path d="M10 16h4" stroke="currentColor" strokeWidth="2" />
    <line x1="10" y1="18.5" x2="10" y2="21" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="18.5" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" />
    <line x1="14" y1="18.5" x2="14" y2="21" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// Selector de icono de rango
export const RankVectorIcon: React.FC<{ rankName?: string; className?: string; size?: number }> = ({
  rankName,
  className,
  size,
}) => {
  switch (rankName) {
    case 'ELITE_OPERATOR':
      return <EliteOperatorIcon className={className || "w-7 h-7 text-amber-400"} size={size} />;
    case 'SECURITY_SPECIALIST':
      return <SecuritySpecialistIcon className={className || "w-7 h-7 text-purple-400"} size={size} />;
    case 'VULNERABILITY_HUNTER':
      return <VulnerabilityHunterIcon className={className || "w-7 h-7 text-cyan-400"} size={size} />;
    case 'SCRIPT_ROOKIE':
    default:
      return <ScriptRookieIcon className={className || "w-7 h-7 text-emerald-400"} size={size} />;
  }
};

// Selector de icono de modo
export const GameModeVectorIcon: React.FC<{ mode: string; className?: string; size?: number }> = ({
  mode,
  className,
  size,
}) => {
  switch (mode.toUpperCase()) {
    case 'IMPOSSIBLE':
      return <ImpossibleModeIcon className={className || "w-6 h-6 text-red-400"} size={size} />;
    case 'HACKING':
      return <HackingModeIcon className={className || "w-6 h-6 text-emerald-400"} size={size} />;
    case 'NORMAL':
    default:
      return <NormalModeIcon className={className || "w-6 h-6 text-sky-400"} size={size} />;
  }
};
