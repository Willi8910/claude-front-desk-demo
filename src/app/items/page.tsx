import type { Metadata } from "next";
import { ItemsWorkspace } from "@/components/items/items-workspace";

export const metadata: Metadata = { title: "Workspace" };
export default function ItemsPage() {
  return <ItemsWorkspace />;
}
