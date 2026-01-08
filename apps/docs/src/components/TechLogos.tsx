'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

// PostgreSQL Logo
export function PostgreSQLLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.5598 21.4189C23.4323 21.1152 23.1884 20.8893 22.9029 20.7717C22.7098 20.6942 22.4928 20.6703 22.2698 20.7002C21.8893 20.7493 21.4513 20.9514 21.0243 21.3345C20.1103 22.1521 19.3373 23.9072 18.8682 24.9988C18.6522 25.5029 18.8372 26.0757 19.2948 26.3794C19.4548 26.4868 19.6358 26.5524 19.8258 26.5703C20.3038 26.6182 20.8278 26.3495 21.2458 25.9186C22.1908 24.9439 23.8328 22.0996 23.5598 21.4189Z" fill="currentColor"/>
      <path d="M28.8003 17.8701C28.6003 16.9224 27.8123 16.4038 26.5882 16.4636C25.6472 16.5035 24.5972 16.7295 23.6222 16.9923C23.5612 16.6706 23.4752 16.3609 23.3652 16.0631C23.9402 15.4542 24.4072 14.7417 24.7142 13.9553C25.2372 12.6141 25.3092 11.2092 24.8512 10.0997C24.4192 9.05607 23.5912 8.33457 22.4962 8.04091C21.2681 7.71129 20.1121 7.97599 19.1151 8.43073C18.2851 8.81133 17.5201 9.36111 16.8621 9.92692C15.7401 9.0614 14.4651 8.43672 13.1001 8.12107C11.3151 7.70531 9.55913 7.88024 7.95314 8.62972C5.35318 9.84512 3.66123 12.3858 3.14525 15.7827C2.83627 17.8103 3.00326 20.0277 3.62425 22.1152C4.23024 24.1548 5.24821 25.8321 6.5002 26.8705C7.0972 27.3751 7.73219 27.7238 8.36517 27.8911C8.61116 27.9587 8.86015 27.992 9.10414 27.992C10.0211 27.992 10.8701 27.5173 11.3991 26.8066C11.8361 26.2208 12.1211 25.4923 12.3421 24.7339L12.4581 24.3353C12.5591 24.0036 12.6531 23.6719 12.7401 23.3402C13.2701 23.4316 13.8111 23.4855 14.3571 23.4995C14.4481 23.5015 14.5381 23.5035 14.6281 23.5035C15.1451 23.5035 15.6511 23.4536 16.1431 23.3621C16.1441 23.4456 16.1451 23.5275 16.1501 23.6092C16.1601 23.7743 16.1771 23.9349 16.2011 24.0937C16.2661 24.5474 16.3781 24.9921 16.5411 25.4125C16.8041 26.0926 17.1831 26.7054 17.6911 27.2027C18.3241 27.8213 19.0611 28.198 19.8321 28.198C20.0121 28.198 20.1941 28.178 20.3771 28.138C21.4361 27.9028 22.2991 27.0991 22.8771 25.8521C23.0611 25.4524 23.2201 25.0368 23.3571 24.6073C23.8781 24.4444 24.3881 24.2716 24.8811 24.0927C25.1071 24.0093 25.3371 23.9298 25.5701 23.8504C26.4251 23.5565 27.3291 23.3043 28.1001 23.2108C28.6771 23.1412 29.5161 22.984 29.3361 21.7828C29.2711 21.3498 29.1141 20.9506 28.8781 20.5936C29.0311 19.6937 29.0281 18.7738 28.8003 17.8701ZM26.1032 22.0278C25.0232 22.1772 23.7362 22.5708 22.5812 22.9984C22.6012 22.7074 22.6092 22.4104 22.6052 22.1114C22.5942 21.2535 22.4852 20.4177 22.2632 19.6359C23.0572 19.4112 23.8362 19.2224 24.5652 19.1051C25.1092 19.0176 25.9982 18.9042 26.3912 19.0755C26.5262 19.1351 26.6322 19.2384 26.7002 19.404C26.7927 19.6199 26.8387 19.8577 26.8557 20.0856C26.3532 20.3044 26.0162 20.7159 25.9342 21.2395C25.8452 21.8123 25.8282 21.9178 26.1032 22.0278ZM10.0571 25.7427C9.58712 26.3575 8.94114 26.5025 8.52915 26.3934C8.13116 26.2884 7.70917 26.0287 7.30018 25.6889C6.24421 24.8111 5.35522 23.3162 4.82124 21.5155C4.25825 19.6219 4.11426 17.6206 4.38725 15.8239C4.83224 12.8875 6.26921 10.7222 8.4412 9.70391C9.75816 9.08722 11.2241 8.97032 12.6911 9.34294C13.8791 9.64459 14.9821 10.2274 15.9331 11.0332C15.7751 11.1986 15.6201 11.3739 15.4721 11.5591C14.7521 12.4628 14.2111 13.5782 13.9271 14.7476C13.8661 14.9967 13.8121 15.2538 13.7681 15.5169C13.3591 15.3162 12.9321 15.1594 12.4921 15.0521C11.5181 14.8134 10.5081 14.8533 9.56212 15.1694C9.14913 15.308 8.92613 15.7474 9.06513 16.1591C9.20412 16.5708 9.64511 16.7937 10.0581 16.6551C10.7451 16.4264 11.4781 16.3968 12.1781 16.5668C12.4691 16.6373 12.7531 16.7384 13.0241 16.8674C12.9701 17.5216 12.9711 18.1837 13.0301 18.8359C13.0641 19.2136 13.1201 19.5872 13.1991 19.9549C12.7431 19.9609 12.2821 20.0124 11.8241 20.1118C10.9131 20.3094 10.0551 20.6731 9.27813 21.1886C8.91314 21.4304 8.81114 21.9219 9.05213 22.2857C9.29312 22.6495 9.78611 22.7513 10.1511 22.5106C10.7621 22.1052 11.4341 21.8183 12.1501 21.6627C12.4221 21.6029 12.7001 21.5671 12.9791 21.5531C13.1441 22.0768 13.3591 22.5845 13.6221 23.0584C12.2201 23.2059 11.2001 23.3801 10.7621 24.4866C10.5741 24.9639 10.4611 25.3515 10.0571 25.7427Z" fill="currentColor"/>
      <path d="M21.1863 16.7266C20.8533 15.7849 20.3213 14.9392 19.6433 14.2432C19.0093 13.5931 18.2703 13.0632 17.4663 12.6864C18.0103 12.0845 18.4543 11.4366 18.7853 10.7625C19.3493 9.61696 19.5843 8.65738 19.3143 7.99866C19.0443 7.33993 18.3563 7.03032 17.4533 7.08127C16.5503 7.13222 15.5133 7.53679 14.5163 8.28629C14.0943 8.60391 13.7063 8.96951 13.3543 9.37308C12.2193 9.10239 11.0393 9.19929 9.96729 9.65004C8.8953 10.1008 8.02531 10.8621 7.47732 11.8117C6.77833 13.0234 6.56534 14.5003 6.85033 15.8817C7.10733 17.1276 7.73232 18.2489 8.6533 19.1126C9.35429 19.7672 10.1423 20.246 11.0483 20.504C11.3103 20.5776 11.5833 20.6303 11.8673 20.6622C11.4933 20.8196 11.1393 21.0049 10.8073 21.2222C10.5363 21.3996 10.4063 21.7024 10.4893 21.9854C10.5533 22.2045 10.7223 22.3858 10.9503 22.4614C11.0643 22.4992 11.1843 22.5092 11.3023 22.4872C11.5173 22.4454 11.7103 22.3399 11.8433 22.2045C11.8723 22.1746 11.9013 22.1447 11.9323 22.1188C12.3513 21.7363 12.8103 21.4097 13.2993 21.1529C13.4843 21.0494 13.6823 20.9659 13.8763 20.8803C14.5173 21.7302 15.3363 22.4195 16.3033 22.8899C16.6813 23.0693 17.0763 23.2008 17.4923 23.2905C17.8323 23.3621 18.1993 23.3959 18.5633 23.3959C19.0793 23.3959 19.5903 23.3222 20.0753 23.1728C21.5963 22.7062 22.7713 21.5742 23.3383 20.0853C23.6153 19.3609 23.7133 18.5692 23.6203 17.7734C23.5503 17.1636 23.3713 16.5817 23.1013 16.0479C22.5503 14.9591 21.6263 14.1096 20.4743 13.6311C20.6083 13.1744 20.7103 12.7038 20.7753 12.2251C20.9613 10.8681 20.7163 9.76456 20.0623 9.03907C19.5273 8.45138 18.7703 8.15776 17.8373 8.24866C17.0333 8.32658 16.2283 8.67618 15.5353 9.24897C14.9743 9.71369 14.4863 10.3173 14.1023 11.0417C13.9733 11.2827 13.8653 11.5257 13.7663 11.7746C13.9083 11.6871 14.0523 11.6016 14.1973 11.5181C15.0573 11.0216 15.9973 10.7429 16.9043 10.7429C17.3293 10.7429 17.7443 10.8005 18.1273 10.9201C19.3923 11.3149 20.3973 12.1655 20.9943 13.3114C21.3023 13.9024 21.4883 14.5599 21.5483 15.2593C21.4033 15.3209 21.2613 15.3905 21.1203 15.4681C20.1263 16.015 19.2823 16.7465 18.6523 17.6143C18.4323 17.9173 18.5053 18.3409 18.8113 18.5615C18.9293 18.6441 19.0663 18.6859 19.2043 18.6859C19.4113 18.6859 19.6133 18.5854 19.7443 18.3986C20.2483 17.7085 20.9173 17.1177 21.6983 16.6872C21.5323 16.6991 21.3623 16.7086 21.1863 16.7266Z" fill="currentColor"/>
    </svg>
  );
}

// MongoDB Logo
export function MongoDBLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.62 5C16.62 5 15.02 8.06 14.18 9.72C11.7 14.04 12.84 17.36 14.74 20.5C15.16 21.2 15.58 21.84 16 22.42C16.04 22.48 16.1 22.58 16.14 22.62C16.24 22.52 16.32 22.38 16.4 22.26C17.96 19.8 19.24 17.1 18.6 13.88C18.12 11.56 16.84 9.56 16.62 5Z" fill="currentColor"/>
      <path d="M16.62 5C16.58 5.26 16.5 5.5 16.4 5.76C15.54 8.28 13.92 10.34 13.2 12.94C12.34 16.06 13.52 18.88 15.48 21.42C15.66 21.68 15.84 21.9 16.02 22.12C16.02 22.12 16.04 22.16 16.06 22.18V27.52C16.06 27.52 16.44 27.44 16.62 27.38V22.62C16.66 22.58 16.68 22.56 16.72 22.52C16.88 22.34 17.04 22.14 17.18 21.94C18.74 19.76 20 17.28 19.56 14.48C19.14 11.76 17.3 9.5 16.62 5Z" fill="currentColor" opacity="0.6"/>
      <path d="M16.3 22.94C16.18 22.82 15.98 22.78 15.82 22.8C15.62 22.82 15.46 22.98 15.44 23.18L15.22 26.76C15.2 27.04 15.42 27.28 15.7 27.28H16.54C16.82 27.28 17.04 27.04 17.02 26.76L16.8 23.04C16.78 22.88 16.66 22.74 16.52 22.68C16.44 22.64 16.36 22.62 16.28 22.62C16.24 22.62 16.2 22.62 16.14 22.64L16.3 22.94Z" fill="currentColor"/>
    </svg>
  );
}

// Express.js Logo
export function ExpressLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 9H27C27.5523 9 28 9.44772 28 10V22C28 22.5523 27.5523 23 27 23H5C4.44772 23 4 22.5523 4 22V10C4 9.44772 4.44772 9 5 9Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M8 16H12M12 16L10 14M12 16L10 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 16H24M24 16L22 14M24 16L22 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 19L18 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// NestJS Logo  
export function NestJSLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.8 4C18.2 4 17.6 4.2 17.2 4.6C17.6 5.2 17.8 5.8 17.8 6.6C17.8 6.8 17.8 7 17.8 7.2C17.8 7.4 17.8 7.6 17.6 7.8C17.4 8.6 17 9.2 16.4 9.8C15.6 10.4 14.8 10.8 13.8 10.8H13.6C13.4 10.8 13.2 10.8 13 10.8C12.6 10.8 12.2 11 12 11.2C11.6 11.6 11.4 12 11.4 12.6C11.4 13 11.6 13.4 11.8 13.8L12 14C12.2 14.2 12.4 14.4 12.4 14.8C12.4 15 12.4 15.2 12.2 15.4C12.2 15.6 12.2 15.8 12.2 16C12.2 17.2 12.8 18.2 13.8 19C13.4 19.6 13.2 20.4 13.2 21.2C13.2 22.2 13.6 23 14.2 23.8C14.4 24 14.6 24.2 14.8 24.4C15.4 24.8 16.2 25.2 17 25.4C17.8 25.6 18.6 25.8 19.4 25.8C20.2 25.8 21 25.6 21.8 25.4C22.6 25.2 23.4 24.8 24 24.4C24.2 24.2 24.4 24 24.6 23.8C25.2 23 25.6 22.2 25.6 21.2C25.6 20.4 25.4 19.6 25 19C26 18.2 26.6 17.2 26.6 16C26.6 15.8 26.6 15.6 26.6 15.4C26.4 15.2 26.4 15 26.4 14.8C26.4 14.4 26.6 14.2 26.8 14L27 13.8C27.2 13.4 27.4 13 27.4 12.6C27.4 12 27.2 11.6 26.8 11.2C26.4 11 26.2 10.8 25.8 10.8C25.6 10.8 25.4 10.8 25.2 10.8H25C24 10.8 23.2 10.4 22.4 9.8C21.8 9.2 21.4 8.6 21.2 7.8C21.2 7.6 21 7.4 21 7.2C21 7 21 6.8 21 6.6C21 5.8 21.2 5.2 21.6 4.6C21.2 4.2 20.6 4 20 4H18.8Z" fill="currentColor"/>
    </svg>
  );
}

// AWS Lambda Logo
export function LambdaLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 26L15.5 6H18.5L11 26H8Z" fill="currentColor"/>
      <path d="M21 26L13.5 6H16.5L24 26H21Z" fill="currentColor"/>
      <path d="M4 6H8L6 10H4V6Z" fill="currentColor" opacity="0.6"/>
      <path d="M28 6H24L26 10H28V6Z" fill="currentColor" opacity="0.6"/>
    </svg>
  );
}

// Vercel Logo
export function VercelLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 5L28 27H4L16 5Z" fill="currentColor"/>
    </svg>
  );
}

// JWT Logo (Shield with key)
export function JWTLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4L6 8V15C6 21.08 10.28 26.72 16 28C21.72 26.72 26 21.08 26 15V8L16 4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="16" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M16 17V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 20H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// Crypto Logo (Lock)
export function CryptoLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7" y="14" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M10 14V10C10 6.68629 12.6863 4 16 4C19.3137 4 22 6.68629 22 10V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="20" r="2" fill="currentColor"/>
      <path d="M16 22V24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// Browser Security Logo (Shield with globe)
export function BrowserSecurityLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4L6 8V15C6 21.08 10.28 26.72 16 28C21.72 26.72 26 21.08 26 15V8L16 4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="16" cy="15" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M11 15H21" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <path d="M16 10C14.5 11.5 14 13.5 14 15C14 16.5 14.5 18.5 16 20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <path d="M16 10C17.5 11.5 18 13.5 18 15C18 16.5 17.5 18.5 16 20" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

// Secure Coding Logo (Code with shield)
export function SecureCodingLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4L6 8V15C6 21.08 10.28 26.72 16 28C21.72 26.72 26 21.08 26 15V8L16 4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M12 15L10 17L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 15L22 17L20 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 13L15 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// Import/Architecture Logo (Modules)
export function ImportNextLogo({ className }: LogoProps) {
  return (
    <svg className={cn('size-6', className)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="18" y="6" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="11" y="18" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M9 14V16C9 17.1046 9.89543 18 11 18H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M23 14V16C23 17.1046 22.1046 18 21 18H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// Map plugin names to logos
export const pluginLogos: Record<string, React.ComponentType<LogoProps>> = {
  'eslint-plugin-secure-coding': SecureCodingLogo,
  'eslint-plugin-pg': PostgreSQLLogo,
  'eslint-plugin-jwt': JWTLogo,
  'eslint-plugin-crypto': CryptoLogo,
  'eslint-plugin-browser-security': BrowserSecurityLogo,
  'eslint-plugin-mongodb-security': MongoDBLogo,
  'eslint-plugin-vercel-ai-security': VercelLogo,
  'eslint-plugin-express-security': ExpressLogo,
  'eslint-plugin-nestjs-security': NestJSLogo,
  'eslint-plugin-lambda-security': LambdaLogo,
  'eslint-plugin-import-next': ImportNextLogo,
};
