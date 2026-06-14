import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Auth.js (NextAuth v4) configuration.
 *
 * - Credentials provider (email/password) with bcrypt verification.
 * - JWT sessions in secure, httpOnly cookies.
 * - BankID OIDC and Vipps Login are intentionally NOT enabled here yet;
 *   see lib/adapters/identity.ts for the placeholder adapters and
 *   docs/PROVIDE_KEYS_AND_CONFIG.md for what an agreement requires.
 */
export const authOptions: NextAuthOptions = {
  secret: env.authSecret || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/logg-inn",
  },
  providers: [
    CredentialsProvider({
      name: "E-post og passord",
      credentials: {
        email: { label: "E-post", type: "email" },
        password: { label: "Passord", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase().trim();

        const rate = await checkRateLimit({ key: `auth:${email}`, limit: 10, windowSeconds: 300 });
        if (!rate.allowed) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || user.deletedAt) return null;
        if (user.status === "SUSPENDED" || user.status === "DELETED") return null;

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
