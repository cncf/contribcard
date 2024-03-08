const updateMetaTags = (url?: string) => {
  document.querySelector(`meta[property='og:url']`)!.setAttribute('content', url || window.location.href);
};

export default updateMetaTags;
