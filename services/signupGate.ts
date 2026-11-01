// Email signup signs the user in the moment the account is created, which
// fires App's onAuthStateChanged and unmounts LoginScreen while signup is still
// saving the profile and joining the invite family. LoginScreen holds this gate
// for the rest of signup; App's auth listener waits on it before letting the
// user in, so the baby-exists check sees the family it just joined.

let pending: Promise<void> | null = null;

/** Starts a signup; call the returned function when signup is done (or failed). */
export const beginSignup = (): (() => void) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  pending = gate;
  return () => {
    if (pending === gate) pending = null;
    release();
  };
};

/** Resolves once no signup is in progress. */
export const waitForSignup = (): Promise<void> => pending ?? Promise.resolve();
