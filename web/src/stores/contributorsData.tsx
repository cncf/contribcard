import { createContext, createSignal, onMount, ParentComponent, useContext } from 'solid-js';

import { ContributorBase, User } from '../types';

function useContributorsDataProvider() {
  const [contributors, setContributors] = createSignal<ContributorBase[] | null>();

  onMount(() => {
    const data: ContributorBase[] = [];

    window.contributors.forEach((u: User) => {
      Object.keys(u).forEach((c: string) => {
        data.push({
          id: u[c],
          login: c,
        });
      });
    });

    setContributors(data);
  });

  return {
    contributors: contributors,
  };
}

export type ContextContributorsDataType = ReturnType<typeof useContributorsDataProvider>;

const ContributorsDataContext = createContext<ContextContributorsDataType | undefined>(undefined);

export const ContributorsDataProvider: ParentComponent = (props) => {
  const value = useContributorsDataProvider();
  return <ContributorsDataContext.Provider value={value}>{props.children}</ContributorsDataContext.Provider>;
};

export function useContributorsData() {
  const context = useContext(ContributorsDataContext);
  if (context === undefined) {
    throw new Error(`useContributorsDataProvider must be used within a ContributorsDataProvider`);
  }
  return context;
}

export function useContributorsDataContent() {
  return useContributorsData().contributors;
}
