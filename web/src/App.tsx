import { Route, Router } from '@solidjs/router';

import Layout from './layout';
import ContributorCard from './layout/contributor';
import Search from './layout/search';

function App() {
  return (
    <Router root={Layout}>
      <Route path="/:id" component={ContributorCard} />
      <Route path="*" component={Search} />
    </Router>
  );
}

export default App;
