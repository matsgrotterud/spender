/** Shared demo credentials from prisma/seed.ts – for login shortcuts only. */
export const DEMO_PASSWORD = "Demo123!";

export interface DemoAccount {
  id: string;
  label: string;
  email: string;
  description: string;
  destination: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "consumer",
    label: "Forbruker",
    email: "consumer@spender.local",
    description: "Se behov, tilbud og personvern",
    destination: "/app",
  },
  {
    id: "business",
    label: "Bedrift",
    email: "business@spender.local",
    description: "Marked, tilbud og kampanjer",
    destination: "/bedrift/app",
  },
  {
    id: "admin",
    label: "Admin",
    email: "admin@spender.local",
    description: "Godkjenning, innhold og system",
    destination: "/admin",
  },
];

/** Demo shortcuts on login can be disabled in production with NEXT_PUBLIC_DEMO_LOGIN=false */
export function isDemoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";
}
