// import { getSession } from "next-auth/react";

// export async function fetchWithAuth(input, init = {}) {
//   const session = await getSession();
//   const token = session?.accessToken;
//   const headers = new Headers(init.headers || {});
//   if (token) headers.set("Authorization", `Bearer ${token}`);
//   if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
//   const res = await fetch(input, { ...init, headers });
//   return res;
// }
