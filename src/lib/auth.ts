import NextAuth from "next-auth";

// Configure your auth providers here.
// See: https://authjs.dev/getting-started/providers
//
// Example with GitHub:
//   import GitHub from "next-auth/providers/github";
//   providers: [GitHub],

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [],
});
