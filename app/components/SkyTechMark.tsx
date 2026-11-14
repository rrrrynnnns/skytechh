type SkyTechMarkProps = {
  compact?: boolean;
};

export function SkyTechMark({ compact = false }: SkyTechMarkProps) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/sky-tech-logo.png"
        alt="Sky-Tech logo"
        className={`${compact ? 'h-9 w-9' : 'h-11 w-11'} rounded-full object-cover object-center`}
      />
      <span>
        <span className={`${compact ? 'text-xs' : 'text-lg'} block font-black tracking-tight text-slate-900`}>Sky-Tech</span>
        <span className={`${compact ? 'text-[8px]' : 'text-[9px]'} block font-bold uppercase tracking-[.18em] text-sky-600`}>Home Fiber</span>
      </span>
    </div>
  );
}