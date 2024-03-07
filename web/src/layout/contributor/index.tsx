import { A, useLocation, useParams } from '@solidjs/router';
import { createSignal, JSXElement, Match, onCleanup, onMount, Show, Switch } from 'solid-js';

import API from '../../api';
import clotributor from '../../assets/clotributor.png';
import { ContributionKind, Contributor } from '../../types';
import prettifyNumber from '../../utils/prettifyNumber';
import updateMetaTags from '../../utils/updateMetaTags';
import ExternalLink from '../common/ExternalLink';
import Image from '../common/Image';
import Loading from '../common/Loading';
import Badges from './Badges';
import styles from './Contributor.module.css';
import ShareContributorLink from './ShareContributorLink';

interface Props {
  kind: ContributionKind;
  color?: string;
}

const formatDate = (ts: number): string => {
  const date = new Date(ts * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = date.getDate();

  return `${month} ${day}, ${year}`;
};

const ContributionKindIcon = (props: Props): JSXElement => {
  return (
    <Switch>
      <Match when={props.kind === ContributionKind.COMMIT}>
        <svg height="1em" viewBox="0 0 16 16" version="1.1" width="1em">
          <path
            fill={props.color || '#6c757d'}
            d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"
          />
        </svg>
      </Match>
      <Match when={props.kind === ContributionKind.ISSUE}>
        <svg height="1em" viewBox="0 0 16 16" version="1.1" width="1em">
          <path fill={props.color || '#6c757d'} d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path
            fill={props.color || '#6c757d'}
            d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"
          />
        </svg>
      </Match>
      <Match when={props.kind === ContributionKind.PR}>
        <svg height="1em" viewBox="0 0 16 16" version="1.1" width="1em">
          <path
            fill={props.color || '#6c757d'}
            d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"
          />
        </svg>
      </Match>
    </Switch>
  );
};

const ContributorCard = () => {
  const location = useLocation();
  const params = useParams();
  const [contributor, setContributor] = createSignal<Contributor | null | undefined>();

  const getFirstContributionLink = () => {
    let url = `https://github.com/${contributor()!.first_contribution.owner}/${
      contributor()!.first_contribution.repository
    }/`;

    switch (contributor()!.first_contribution.kind) {
      case ContributionKind.COMMIT:
        url += `commit/${contributor()!.first_contribution.sha}`;
        break;
      case ContributionKind.ISSUE:
        url += `issues/${contributor()!.first_contribution.number}`;
        break;
      case ContributionKind.PR:
        url += `pull/${contributor()!.first_contribution.number}`;
        break;
    }

    return url;
  };

  async function fecthContributorInfo(contributorId: string) {
    try {
      const data = await API.getContributorInfo(contributorId);
      setContributor(data);
    } catch {
      setContributor(null);
    }
  }

  onMount(() => {
    if (contributor() === undefined) {
      fecthContributorInfo(params.id);
    }
    updateMetaTags(`${window.location.origin}${location.pathname}`);
  });

  onCleanup(() => {
    setContributor();
  });

  return (
    <Show when={contributor() !== undefined} fallback={<Loading />}>
      <Show
        when={contributor() !== null}
        fallback={
          <div class="pt-3 pt-md-5 pb-3">
            <div class={`mb-4 pb-2 ${styles.title}`}>It looks like you are not a contributor yet...</div>

            <div class={`mb-4 pb-4 text-muted ${styles.legend}`}>
              But you can find lots of opportunities to contribute at{' '}
              <ExternalLink href="https://clotributor.dev" class={styles.clotributorLink} underlined>
                clotributor.dev
              </ExternalLink>
              !
            </div>

            <ExternalLink href="https://clotributor.dev" underlined={false}>
              <div class={`mx-auto mt-4 mb-3 mb-md-5 ${styles.clotributorWrapper}`}>
                <img class="w-100" src={clotributor} alt="Clotributor" />
              </div>
            </ExternalLink>
          </div>
        }
      >
        <div class="d-flex flex-row align-items-center mb-4 pt-0 pt-md-3">
          <ExternalLink
            href={`https://github.com/${contributor()!.login}`}
            class="me-3 text-muted avatar"
            underlined={false}
          >
            <Image class="d-block w-100 h-100 mask" login={contributor()!.login} contributorId={contributor()!.id} />
          </ExternalLink>
          <div class={`flex-grow-1 d-flex flex-column justify-content-between ${styles.contributorInfo}`}>
            <div>
              <ExternalLink
                href={`https://github.com/${contributor()!.login}`}
                class={`fw-semibold text-truncate ${styles.displayName}`}
                underlined
              >
                {contributor()!.login}
              </ExternalLink>
            </div>
            <div>
              <Show when={contributor()!.contributions.by_kind[ContributionKind.COMMIT] > 0}>
                <div
                  class={styles.badge}
                  title={
                    contributor()!.contributions.by_kind[ContributionKind.COMMIT]! === 1
                      ? '1 commit'
                      : `${contributor()!.contributions.by_kind[ContributionKind.COMMIT]!} commits`
                  }
                >
                  <div class="d-flex flex-row align-items-center">
                    <div class={styles.badgeIcon}>
                      <ContributionKindIcon kind={ContributionKind.COMMIT} />
                    </div>
                    <div class={styles.badgeContent}>
                      {prettifyNumber(contributor()!.contributions.by_kind[ContributionKind.COMMIT]!, 1)}
                    </div>
                  </div>
                </div>
              </Show>
              <Show when={contributor()!.contributions.by_kind[ContributionKind.PR] > 0}>
                <div
                  class={styles.badge}
                  title={
                    contributor()!.contributions.by_kind[ContributionKind.PR]! === 1
                      ? '1 pull request'
                      : `${contributor()!.contributions.by_kind[ContributionKind.PR]!} pull requests`
                  }
                >
                  <div class="d-flex flex-row align-items-center">
                    <div class={styles.badgeIcon}>
                      <ContributionKindIcon kind={ContributionKind.PR} />
                    </div>
                    <div class={styles.badgeContent}>
                      {prettifyNumber(contributor()!.contributions.by_kind[ContributionKind.PR]!, 1)}
                    </div>
                  </div>
                </div>
              </Show>
              <Show when={contributor()!.contributions.by_kind[ContributionKind.ISSUE] > 0}>
                <div
                  class={styles.badge}
                  title={
                    contributor()!.contributions.by_kind[ContributionKind.ISSUE]! === 1
                      ? '1 issue'
                      : `${contributor()!.contributions.by_kind[ContributionKind.ISSUE]!} issues`
                  }
                >
                  <div class="d-flex flex-row align-items-center">
                    <div class={styles.badgeIcon}>
                      <ContributionKindIcon kind={ContributionKind.ISSUE} />
                    </div>
                    <div class={styles.badgeContent}>
                      {prettifyNumber(contributor()!.contributions.by_kind[ContributionKind.ISSUE]!, 1)}
                    </div>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="py-0 py-md-2">
          <div class={`lh-1 text-muted text-truncate ${styles.subtitle}`}>
            <span class="fw-bold">{prettifyNumber(contributor()!.contributions.total, 1)}</span>{' '}
            {contributor()!.contributions.total === 1 ? 'contribution' : 'contributions'} to{' '}
            <span class="fw-bold">{contributor()!.repositories.length}</span>{' '}
            {contributor()!.repositories.length === 1 ? 'repository' : 'repositories'}
          </div>
        </div>

        <div class="mt-4">
          <div class={`text-muted text-uppercase ${styles.generalTitle}`}>First contribution</div>
          <ExternalLink class={`mt-2 ${styles.card}`} href={getFirstContributionLink()} underlined={false}>
            <div class="d-flex flex-row align-items-top">
              <div class={`pe-2 text-muted ${styles.contribIcon}`}>
                <ContributionKindIcon kind={contributor()!.first_contribution.kind} />
              </div>
              <div class={`d-flex flex-column justify-content-between ${styles.firstContribContent}`}>
                <div class={`fw-bold text-truncate w-100 ${styles.firstContributionRepo}`}>
                  {contributor()!.first_contribution.owner}/{contributor()!.first_contribution.repository}
                </div>
                <div class={`fw-semibold text-truncate w-100 ${styles.firstContributionLink}`}>
                  {contributor()!.first_contribution.title.trim()}
                </div>
                <div class={`text-muted ${styles.date}`}>
                  <small>{formatDate(contributor()!.first_contribution.ts)}</small>
                </div>
              </div>
            </div>
          </ExternalLink>

          <div class="mt-4">
            <div class={`text-muted text-uppercase ${styles.generalTitle}`}>
              Years contributing ({contributor()!.years.length})
            </div>
            <Badges items={contributor()!.years} sorted />
          </div>

          <div class="mt-4">
            <div class={`text-muted text-uppercase ${styles.generalTitle}`}>
              Repositories ({contributor()!.repositories.length})
            </div>
            <Badges items={contributor()!.repositories} withTitle />
          </div>

          <div class={`pt-0 pt-md-3 ${styles.buttons}`}>
            <div class="d-flex flex-row align-items-center justify-content-center">
              <ShareContributorLink />

              <A class={styles.blueBtn} href="/">
                <div class="d-flex flex-row align-items-center justify-content-center">
                  <div class={`me-2 ${styles.blueBtnIcon}`}>
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      stroke-width="0"
                      viewBox="0 0 576 512"
                      height="1em"
                      width="1em"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M528 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h480c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 400H303.2c.9-4.5.8 3.6.8-22.4 0-31.8-30.1-57.6-67.2-57.6-10.8 0-18.7 8-44.8 8-26.9 0-33.4-8-44.8-8-37.1 0-67.2 25.8-67.2 57.6 0 26-.2 17.9.8 22.4H48V144h480v288zm-168-80h112c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8H360c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8zm0-64h112c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8H360c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8zm0-64h112c4.4 0 8-3.6 8-8v-16c0-4.4-3.6-8-8-8H360c-4.4 0-8 3.6-8 8v16c0 4.4 3.6 8 8 8zm-168 96c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64z" />
                    </svg>
                  </div>
                  <div>Get yours</div>
                </div>
              </A>
            </div>
          </div>
          <div class={`d-flex justify-content-center ${styles.messageWrapper}`}>
            <div class={styles.message}>Thank you for your contributions!</div>
          </div>
        </div>
      </Show>
    </Show>
  );
};

export default ContributorCard;
