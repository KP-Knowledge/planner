import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { getDb } from "@/db/client";
import { upsertUserFromProfile } from "@/server/users";

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    idToken?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        if (!profile?.sub) throw new Error("Keycloak profile is missing sub");
        const user = await upsertUserFromProfile(getDb(), {
          sub: profile.sub,
          name: profile.name ?? undefined,
          email: profile.email ?? undefined,
          picture: typeof profile.picture === "string" ? profile.picture : undefined,
        });
        token.uid = user.id;
        token.idToken = account.id_token;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
});
