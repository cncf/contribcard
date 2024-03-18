import { createEffect, createSignal, For, JSXElement, Match, on, onCleanup, Show, Switch } from 'solid-js';

import { LinkShare } from '../../types';
import styles from './ShareContributorLink.module.css';

interface Props {
  icon: LinkShare;
}

const LinkIcon = (props: Props): JSXElement => {
  return (
    <Switch>
      <Match when={props.icon === LinkShare.X}>
        <svg
          stroke="currentColor"
          fill="currentColor"
          stroke-width="0"
          viewBox="0 0 512 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
        </svg>
      </Match>
      <Match when={props.icon === LinkShare.Facebook}>
        <svg
          stroke="currentColor"
          fill="currentColor"
          stroke-width="0"
          viewBox="0 0 320 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
        </svg>
      </Match>
      <Match when={props.icon === LinkShare.LinkedIn}>
        <svg
          stroke="currentColor"
          fill="currentColor"
          stroke-width="0"
          viewBox="0 0 448 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" />
        </svg>
      </Match>
      <Match when={props.icon === LinkShare.WhatsApp}>
        <svg
          stroke="currentColor"
          fill="currentColor"
          stroke-width="0"
          viewBox="0 0 448 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
        </svg>
      </Match>
      <Match when={props.icon === LinkShare.Email}>
        <svg
          stroke="currentColor"
          fill="currentColor"
          stroke-width="0"
          viewBox="0 0 512 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm0 48v40.805c-22.422 18.259-58.168 46.651-134.587 106.49-16.841 13.247-50.201 45.072-73.413 44.701-23.208.375-56.579-31.459-73.413-44.701C106.18 199.465 70.425 171.067 48 152.805V112h416zM48 400V214.398c22.914 18.251 55.409 43.862 104.938 82.646 21.857 17.205 60.134 55.186 103.062 54.955 42.717.231 80.509-37.199 103.053-54.947 49.528-38.783 82.032-64.401 104.947-82.653V400H48z" />
        </svg>
      </Match>
      <Match when={props.icon === LinkShare.Reddit}>
        <svg
          stroke="currentColor"
          fill="currentColor"
          stroke-width="0"
          viewBox="0 0 512 512"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M440.3 203.5c-15 0-28.2 6.2-37.9 15.9-35.7-24.7-83.8-40.6-137.1-42.3L293 52.3l88.2 19.8c0 21.6 17.6 39.2 39.2 39.2 22 0 39.7-18.1 39.7-39.7s-17.6-39.7-39.7-39.7c-15.4 0-28.7 9.3-35.3 22l-97.4-21.6c-4.9-1.3-9.7 2.2-11 7.1L246.3 177c-52.9 2.2-100.5 18.1-136.3 42.8-9.7-10.1-23.4-16.3-38.4-16.3-55.6 0-73.8 74.6-22.9 100.1-1.8 7.9-2.6 16.3-2.6 24.7 0 83.8 94.4 151.7 210.3 151.7 116.4 0 210.8-67.9 210.8-151.7 0-8.4-.9-17.2-3.1-25.1 49.9-25.6 31.5-99.7-23.8-99.7zM129.4 308.9c0-22 17.6-39.7 39.7-39.7 21.6 0 39.2 17.6 39.2 39.7 0 21.6-17.6 39.2-39.2 39.2-22 .1-39.7-17.6-39.7-39.2zm214.3 93.5c-36.4 36.4-139.1 36.4-175.5 0-4-3.5-4-9.7 0-13.7 3.5-3.5 9.7-3.5 13.2 0 27.8 28.5 120 29 149 0 3.5-3.5 9.7-3.5 13.2 0 4.1 4 4.1 10.2.1 13.7zm-.8-54.2c-21.6 0-39.2-17.6-39.2-39.2 0-22 17.6-39.7 39.2-39.7 22 0 39.7 17.6 39.7 39.7-.1 21.5-17.7 39.2-39.7 39.2z" />
        </svg>
      </Match>
      <Match when={props.icon === LinkShare.Copy}>
        <svg
          stroke="currentColor"
          fill="none"
          stroke-width="2"
          viewBox="0 0 24 24"
          stroke-linecap="round"
          stroke-linejoin="round"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </Match>
    </Switch>
  );
};

const MESSAGE = `Happy #kuberTENes! Check out my #FirstContribution to Kubernetes #ContribCard`;

const ShareContributorLink = () => {
  const [visibleButtons, setVisibleButtons] = createSignal<boolean>(false);
  const [copyStatus, setCopyStatus] = createSignal<boolean>(false);
  const [tooltipTimeout, setTooltipTimeout] = createSignal<number | null>(null);

  const clickSocialIcon = (k: LinkShare) => {
    setVisibleButtons(false);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const urlToShare = window.location.href;
    let url = '';

    switch (k) {
      case LinkShare.X:
        url += `https://twitter.com/intent/tweet?text=${encodeURIComponent(MESSAGE)}&url=${urlToShare}`;
        break;
      case LinkShare.Facebook:
        url += `https://www.facebook.com/sharer/sharer.php?u=${urlToShare}&quote=${encodeURIComponent(MESSAGE)}`;
        break;
      case LinkShare.LinkedIn:
        url += `https://www.linkedin.com/sharing/share-offsite/?url=${urlToShare}`;
        break;
      case LinkShare.WhatsApp:
        if (isMobile) {
          url += 'https://wa.me/';
        } else {
          url += 'https://web.whatsapp.com/send';
        }
        url += `?text=${encodeURIComponent(`${MESSAGE} ${urlToShare}`)}`;
        break;
      case LinkShare.Email:
        url += `mailto:?subject=${encodeURIComponent('Happy #kuberTENes!')}&body=${encodeURIComponent(
          `${MESSAGE} ${urlToShare}`
        )}`;
        break;
      case LinkShare.Reddit:
        url += `https://www.reddit.com/submit?url=${urlToShare}&title=${encodeURIComponent(MESSAGE)}`;
        break;
    }

    window.open(url, '_blank');
  };

  async function copyToClipboard() {
    if (!navigator.clipboard) {
      try {
        const textField = document.createElement('textarea');
        textField.textContent = window.location.href;
        document.body.appendChild(textField);
        textField.select();
        document.execCommand('copy');
        textField.remove();
        setCopyStatus(true);
      } catch {
        setCopyStatus(false);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopyStatus(true);
      } catch {
        setCopyStatus(false);
      }
    }
  }

  createEffect(
    on(copyStatus, () => {
      if (copyStatus()) {
        // Hide tooltip after 1s
        setTooltipTimeout(setTimeout(() => setCopyStatus(false), 1 * 1000));
      }
    })
  );

  onCleanup(() => {
    if (tooltipTimeout() !== null) {
      clearTimeout(tooltipTimeout()!);
    }
  });

  return (
    <>
      <button class={styles.shareBtn} onClick={() => setVisibleButtons(!visibleButtons())}>
        <div class="d-flex flex-row align-items-center justify-content-center">
          <div class={`me-2 ${styles.shareIcon}`}>
            <svg
              stroke="currentColor"
              fill="currentColor"
              stroke-width="0"
              viewBox="0 0 512 512"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M503.691 189.836L327.687 37.851C312.281 24.546 288 35.347 288 56.015v80.053C127.371 137.907 0 170.1 0 322.326c0 61.441 39.581 122.309 83.333 154.132 13.653 9.931 33.111-2.533 28.077-18.631C66.066 312.814 132.917 274.316 288 272.085V360c0 20.7 24.3 31.453 39.687 18.164l176.004-152c11.071-9.562 11.086-26.753 0-36.328z" />
            </svg>
          </div>
          <div>Share</div>
        </div>
      </button>
      <div class={styles.wrapper} classList={{ [styles.visible]: visibleButtons() }}>
        <div class={styles.content}>
          <button class={`text-muted ${styles.closeBtn}`} onClick={() => setVisibleButtons(false)}>
            <svg
              stroke="currentColor"
              fill="currentColor"
              stroke-width="0"
              viewBox="0 0 512 512"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M405 136.798L375.202 107 256 226.202 136.798 107 107 136.798 226.202 256 107 375.202 136.798 405 256 285.798 375.202 405 405 375.202 285.798 256z" />
            </svg>
          </button>
          <div class={styles.title}>Share your contributor card</div>
          <div class={`d-flex flex-row ${styles.buttons}`}>
            <For each={Object.values(LinkShare)}>
              {(s: LinkShare) => {
                const isCopy = s === LinkShare.Copy;
                return (
                  <div class="position-relative">
                    <button
                      onClick={() => (isCopy ? copyToClipboard() : clickSocialIcon(s))}
                      class={`d-flex flex-row align-items-center justify-content-center ${styles.button}`}
                      classList={{
                        [styles.isMobileHidden]: s === LinkShare.Reddit,
                        [styles.copied]: copyStatus() && isCopy,
                      }}
                    >
                      <div>
                        <Show when={copyStatus() && isCopy} fallback={<LinkIcon icon={s} />}>
                          <svg
                            stroke="currentColor"
                            fill="currentColor"
                            stroke-width="0"
                            viewBox="0 0 24 24"
                            height="1em"
                            width="1em"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path fill="none" d="M0 0h24v24H0z" />
                            <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                          </svg>
                        </Show>
                      </div>
                    </button>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShareContributorLink;
