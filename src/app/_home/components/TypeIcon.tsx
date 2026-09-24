import { Home, Mountain } from "lucide-react";
import type { PropertyType } from "../types";

export function TypeIcon({ type, className }: { type: PropertyType; className?: string }) {
  const Icon = type === "land" ? Mountain : Home;

  return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />;
}
