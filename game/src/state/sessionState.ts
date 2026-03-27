// store/useColonyStore.ts
import { create } from "zustand";
import axios from "axios";
import { SERVER_BASE_URL } from "./constants";

interface SessionState {
  loggedIn: boolean;
  loggingIn: boolean;
  stateLoaded: boolean;
  username: string;
  curScreen: "title" | "game";
  goToGame: () => void;
  goToTitle: () => void;
  attemptSignup: (signupInput: string) => Promise<void>;
  attemptLogin: (loginInput: string) => Promise<void>;
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

  attemptSignup: async (signupInput: string) => {
    
    const path = "user/init"
    const response = await axios.post(SERVER_BASE_URL + path, {username:signupInput});
    
    if(!response.data.success) {
      throw new Error("User already exists")
    }
  },

  attemptLogin: async (loginInput: string) => {
    set({ loggingIn: true });
    
    // await new Promise((resolve) => setTimeout(resolve, 500));
    const path = "session/login"
    const response = await axios.post(SERVER_BASE_URL + path, {username:loginInput});
    set({ loggingIn: false });
    
    if(!response.data.success) {
      throw new Error("User doesn't exist")
    }

    set({ loggedIn: true, loggingIn: false });

  },

  setStateLoaded: async () => {
    set({ stateLoaded: true });
  },

  setLoggingIn: (value: boolean) => {
    set({ loggingIn: value });
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
