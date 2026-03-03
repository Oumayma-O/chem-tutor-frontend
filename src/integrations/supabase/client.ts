// Supabase SDK removed — all student features now use the FastAPI backend.
// Teacher components still import from here; this stub returns empty data so they fail gracefully
// without bundling the ~400 kB @supabase/supabase-js package.

function makeChain(): any {
  const p = Promise.resolve({ data: null, error: null });
  return new Proxy(p, {
    get(target: any, prop: string) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        return target[prop].bind(target);
      }
      return (..._args: unknown[]) => makeChain();
    },
  });
}

export const supabase: any = {
  from: () => makeChain(),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: (_ev: unknown, _cb: unknown) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
  functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  channel: () => ({ on: () => ({ subscribe: () => {} }), unsubscribe: () => {} }),
};
