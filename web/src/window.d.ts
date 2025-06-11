import { UserInfo } from './types';

declare global {
  interface Window {
    contributors: UserInfo;
    email_subject: string;
    social_message: string;
  }
}
