import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth handles sign-up, sign-in, OAuth callbacks and sign-out here.
export const { GET, POST } = toNextJsHandler(auth);
