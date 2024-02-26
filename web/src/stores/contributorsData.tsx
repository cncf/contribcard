import { createContext, createSignal, onMount, ParentComponent, useContext } from 'solid-js';

import { UserInfo } from '../types';

function useContributorsDataProvider() {
  const [contributors, setContributors] = createSignal<string[] | null>();
  const [contributorsInfo, setContributorsInfo] = createSignal<UserInfo | null>();

  onMount(() => {
    setContributors(Object.keys(window.contributors).sort(Intl.Collator().compare));
    setContributorsInfo(window.contributors);
  });

  return {
    contributors: contributors,
    contributorsInfo: contributorsInfo,
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

export function useContributorsDataList() {
  return useContributorsData().contributors;
}

export function useContributorsDataInfo() {
  return useContributorsData().contributorsInfo;
}
