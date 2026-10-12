"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// Browser-side auth client. Same origin as the app, so no baseURL is needed.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
