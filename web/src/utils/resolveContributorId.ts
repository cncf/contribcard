import { UserInfo } from '../types';

const resolveContributorId = (id: string, info: UserInfo | null | undefined): string => {
  if (info) {
    const lower = id.toLowerCase();
    const canonical = Object.keys(info).find((k) => k.toLowerCase() === lower);
    if (canonical) return canonical;
  }
  return id.toLowerCase();
};

export default resolveContributorId;
