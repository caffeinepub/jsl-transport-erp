import { useActor as useActorBase } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";

// Wrapper so callers can use useActor() without passing createActor every time.
// The actor is cast to any because the backend interface is empty in this project
// (all real data lives in localStorage), but the hooks still call actor methods
// defensively with !actor guards.
export function useActor() {
  const result = useActorBase(createActor);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { actor: result.actor as any, isFetching: result.isFetching };
}
