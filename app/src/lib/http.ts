export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }
  let code = "UNKNOWN";
  let message = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body && typeof body === "object") {
      code = body.code ?? code;
      message = body.message ?? message;
    }
  } catch {
    // ignore — non-JSON error body
  }
  throw new ApiError(code, message, res.status);
}

const base = "";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(base + path, {
    credentials: "same-origin",
  });
  return handle<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(base + path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(base + path, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(base + path, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return handle<T>(res);
}

export function qs(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}
