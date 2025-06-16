import { createContext, createSignal, onMount, ParentComponent, useContext } from 'solid-js';

import API from '../api';
import { UserInfo } from '../types';

function useContributorsDataProvider() {
  const [contributors, setContributors] = createSignal<string[]>([]);
  const [contributorsInfo, setContributorsInfo] = createSignal<UserInfo | null>();

  onMount(async () => {
    const allContributors = await API.getAllContributors();
    setContributors(Object.keys(allContributors).sort(Intl.Collator().compare));
    setContributorsInfo(allContributors);
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
