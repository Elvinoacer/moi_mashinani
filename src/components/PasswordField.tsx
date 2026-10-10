'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string };

export function PasswordField({ label, id, className = '', disabled, ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  return <div>
    <label htmlFor={inputId} className="mb-1.5 block text-xs font-bold text-[#243b32]">{label}</label>
    <div className="relative">
      <input {...props} id={inputId} type={visible ? 'text' : 'password'} disabled={disabled} className={`${className} pr-24`} />
      <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-controls={inputId} aria-pressed={visible} disabled={disabled} onClick={() => setVisible(current => !current)} className="absolute inset-y-0 right-1 flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-[#335e41] hover:bg-[#edf2e5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41] disabled:opacity-50">
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  </div>;
}
