export type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };
