import { UserInfo } from './types';

declare global {
  interface Window {
    contributors: UserInfo;
  }
}
