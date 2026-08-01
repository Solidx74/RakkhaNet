import { create } from "zustand";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "CITIZEN" | "VOLUNTEER" | "COORDINATOR" | "ADMIN";
  district: string;
  upazila: string;
  isVerified?: boolean;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  setAuth: (token: string, user: UserProfile) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("rakkhanet_token") : null,
  user: typeof window !== "undefined" && localStorage.getItem("rakkhanet_user")
    ? JSON.parse(localStorage.getItem("rakkhanet_user")!)
    : null,

  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("rakkhanet_token", token);
      localStorage.setItem("rakkhanet_user", JSON.stringify(user));
    }
    set({ token, user });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("rakkhanet_token");
      localStorage.removeItem("rakkhanet_user");
    }
    set({ token: null, user: null });
  },
}));
