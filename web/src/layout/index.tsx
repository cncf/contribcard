import { JSXElement } from 'solid-js';

import { ContributorsDataProvider } from '../stores/contributorsData';

interface Props {
  children?: JSXElement;
}

const Layout = (props: Props) => {
  return <ContributorsDataProvider>{props.children}</ContributorsDataProvider>;
};

export default Layout;
