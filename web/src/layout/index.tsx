import { JSXElement } from 'solid-js';

import { ContributorsDataProvider } from '../stores/contributorsData';
import { SelectedContributorProvider } from '../stores/selectedContributor';

interface Props {
  children?: JSXElement;
}

const Layout = (props: Props) => {
  return (
    <ContributorsDataProvider>
      <SelectedContributorProvider>{props.children}</SelectedContributorProvider>
    </ContributorsDataProvider>
  );
};

export default Layout;
