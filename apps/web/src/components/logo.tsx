export function Logo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="512" height="512" rx="100" fill="#12294B" />
      <path d="M256 100 L404 244 L108 244 Z" fill="#F0B429" />
      <path
        d="M76 322 Q166 270 256 322 T436 322"
        stroke="#F0B429"
        strokeWidth="24"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M76 378 Q166 326 256 378 T436 378"
        stroke="#FFFFFF"
        strokeWidth="24"
        fill="none"
        strokeLinecap="round"
        opacity="0.92"
      />
    </svg>
  );
}
