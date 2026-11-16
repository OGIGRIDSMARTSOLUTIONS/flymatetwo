import { createContext, useContext } from "react";
import type { Role } from "../sender/deliveryApi";

export const roleColors = { sender: "#1254C7", traveler: "#08753D" };
export const RoleTheme = createContext<Role | undefined>(undefined);

export function useRoleColor() {
  const role = useContext(RoleTheme);
  return role ? roleColors[role] : undefined;
}
