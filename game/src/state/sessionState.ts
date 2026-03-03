// store/useColonyStore.ts
import { create } from "zustand";

interface SessionState {
  loggedIn: boolean;
  loggingIn: boolean;
  stateLoaded: boolean;
  username: string;
  curScreen: "title" | "game";
  goToGame: () => void;
  goToTitle: () => void;
  testLogin: () => Promise<void>;
  setLoggingIn: (value: boolean) => void;
  setStateLoaded: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  loggedIn: false,
  loggingIn: false,
  stateLoaded: false,
  username: "",
  curScreen: "title",

  goToGame: () => {
    set({
      curScreen: "game",
    });
  },

  goToTitle: () => {
    set({
      curScreen: "title",
    });
  },

  testLogin: async () => {
    console.log("test login");
    set({loggingIn: true})
    await new Promise((resolve) => setTimeout(resolve, 500));

    set({ loggedIn: true, loggingIn: false });

    await new Promise((resolve) => setTimeout(resolve, 500));

    set({ stateLoaded: true });
  },

  setStateLoaded: async () => {

    console.log("state loaded req")

    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log("state loaded")

    set({ stateLoaded: true });
  },

  setLoggingIn: (value: boolean) => {

    set({loggingIn: value});
  },

  login: async (username: string, password: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      throw new Error("Failed to login");
    }

    const data = await res.json();

    set({
      loggedIn: true,
      stateLoaded: false,
      username: data.username,
      curScreen: "title",
    });
  },

  logout: () => {
    set({
      loggedIn: false,
      stateLoaded: false,
      username: "",
      curScreen: "title",
    });
  },
}));
