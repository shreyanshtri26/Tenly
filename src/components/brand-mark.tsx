// The Tenly mark. Same drawing as src/app/icon.svg (the browser tab icon),
// so the navbar and the tab always match.
export function BrandMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="8" fill="#0b0b0d" />
      <rect x="8.5" y="9.5" width="15" height="3.4" rx="0.9" fill="#d4b06a" />
      <rect x="14.3" y="9.5" width="3.4" height="13.5" rx="0.9" fill="#d4b06a" />
      <circle cx="24.2" cy="7.8" r="2.3" fill="#f2c4c4" />
    </svg>
  );
}
