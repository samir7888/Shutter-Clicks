'use client';

import type { ReactNode } from 'react';

type SegOption<T extends string> = { value: T; label: string };

export function Segmented<T extends string>({
  value, options, onChange, label,
}: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} data-on={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button className="switch" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}>
      <span className="switch-knob" />
    </button>
  );
}

export function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="row">
      <div className="row-label">
        <label htmlFor={htmlFor}>{label}</label>
        {hint && <span className="muted small">{hint}</span>}
      </div>
      <div className="row-control">{children}</div>
    </div>
  );
}

export function Slider({ id, value, min, max, step, onChange, format }: { id: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <div className="slider">
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output htmlFor={id}>{format(value)}</output>
    </div>
  );
}
