import { useLocation, useNavigate } from '@solidjs/router';
import { createContext, createEffect, createSignal, on, ParentComponent, useContext } from 'solid-js';

import API from '../api';
import { Contributor } from '../types';

function useSelectedContributorProvider() {
  const navigate = useNavigate();
  const location = useLocation();
  const [contributorId, setContributorId] = createSignal<string>();
  const [info, setInfo] = createSignal<Contributor | null | undefined>(undefined);

  async function fecthContributorInfo() {
    try {
      const data = await API.getContributorInfo(contributorId()!);
      setInfo(data);
      const url = `/${contributorId()}`;
      if (location.pathname !== url) {
        navigate(url, {
          replace: false,
          scroll: true, // default
        });
      }
    } catch {
      setInfo(null);
    }
  }

  createEffect(
    on(contributorId, () => {
      if (contributorId()) {
        fecthContributorInfo();
      } else {
        if (contributorId() === null) {
          setInfo(null);
        }
      }
    })
  );

  return {
    contributorId: contributorId,
    setContributorId: setContributorId,
    info: info,
  };
}

export type ContextSelectedContributorType = ReturnType<typeof useSelectedContributorProvider>;

const ContributorInfoContext = createContext<ContextSelectedContributorType | undefined>(undefined);

export const SelectedContributorProvider: ParentComponent = (props) => {
  const value = useSelectedContributorProvider();
  return <ContributorInfoContext.Provider value={value}>{props.children}</ContributorInfoContext.Provider>;
};

export function useSelectedContributor() {
  const context = useContext(ContributorInfoContext);
  if (context === undefined) {
    throw new Error(`useSelectedContributorProvider must be used within a SelectedContributorProvider`);
  }
  return context;
}

export function useSelectedContributorId() {
  return useSelectedContributor().contributorId;
}

export function useSetSelectedContributorId() {
  return useSelectedContributor().setContributorId;
}

export function useSelectedContributorInfoContent() {
  return useSelectedContributor().info;
}
