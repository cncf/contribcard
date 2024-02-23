import { User } from "./types";

declare global {
  interface Window {
    contributors: User[];
  }
}
