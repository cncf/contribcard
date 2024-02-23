export interface User {
  [key: string]: number;
}

export interface ContributorBase {
  id: number;
  login: string;
}

export interface Contributor extends ContributorBase {
  contributions: number;
  years: number[];
  repositories: string[];
  first_contribution: {
    number: number;
    kind: ContributionKind;
    owner: string;
    repository: string;
    title: string;
    ts: number;
  };
}

export enum ContributionKind {
  COMMIT = 'commit',
  ISSUE = 'issue',
  PR = 'pull_request',
}
