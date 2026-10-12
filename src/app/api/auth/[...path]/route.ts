import { auth } from "@/lib/auth";

// Neon Auth handles sign-up, sign-in, OAuth callbacks and sign-out here.
export const { GET, POST } = auth.handler();
