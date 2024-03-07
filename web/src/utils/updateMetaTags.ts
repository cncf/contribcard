import { DESCRIPTION } from '../layout/contributor/ShareContributorLink';

const updateMetaTags = (url?: string) => {
  const urlToShare = url || window.location.href;
  const description = `${DESCRIPTION} ${urlToShare}`;

  document.querySelector(`meta[property='og:url']`)!.setAttribute('content', urlToShare);
  document.querySelector(`meta[property='og:description']`)!.setAttribute('content', description);
};

export default updateMetaTags;
