import { useParams } from '@solidjs/router';
import { JSXElement, Match, onCleanup, onMount, Show, Switch } from 'solid-js';

import clotributor from '../../assets/clotributor.png';
import {
  useSelectedContributorId,
  useSelectedContributorInfoContent,
  useSetSelectedContributorId,
} from '../../stores/selectedContributor';
import { ContributionKind } from '../../types';
import prettifyNumber from '../../utils/prettifyNumber';
import ExternalLink from '../common/ExternalLink';
import Badges from './Badges';
import styles from './Contributor.module.css';

interface Props {
  kind: ContributionKind;
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
        <svg height="16" viewBox="0 0 16 16" version="1.1" width="16">
          <path
            fill="#6c757d"
            d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"
          />
        </svg>
      </Match>
      <Match when={props.kind === ContributionKind.ISSUE}>
        <svg height="16" viewBox="0 0 16 16" version="1.1" width="16">
          <path fill="#6c757d" d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path fill="#6c757d" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
        </svg>
      </Match>
      <Match when={props.kind === ContributionKind.PR}>
        <svg height="16" viewBox="0 0 16 16" version="1.1" width="16">
          <path
            fill="#6c757d"
            d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"
          />
        </svg>
      </Match>
    </Switch>
  );
};

const ContributorCard = () => {
  const params = useParams();
  const contributorId = useSelectedContributorId();
  const setContributorId = useSetSelectedContributorId();
  const contributor = useSelectedContributorInfoContent();

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

  onMount(() => {
    if (contributorId() === undefined) {
      setContributorId(params.id);
    }
  });

  onCleanup(() => {
    setContributorId();
  });

  return (
    <Show
      when={contributor() !== undefined}
      fallback={
        <div class={styles.loadingWrapper}>
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    >
      <Show
        when={contributor() !== null}
        fallback={
          <div class={`pt-3 pt-md-5 pb-3 ${styles.noContributor}`}>
            <div class={`fs-2 mb-4 pb-2 ${styles.title}`}>It looks like you are not a contributor yet...</div>

            <div class={`fs-4 mb-4 pb-4 text-muted ${styles.legend}`}>
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
          <div class="me-3 avatar">
            <img
              class="d-block w-100 h-100 mask"
              src={`https://avatars.githubusercontent.com/u/${contributor()!.id}`}
              alt="Avatar"
            />
          </div>
          <div class={`flex-grow-1 ${styles.contributorInfo}`}>
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
              <ExternalLink
                href={`https://github.com/${contributor()!.login}`}
                class={`text-muted text-truncate ${styles.githubLink}`}
                underlined
              >
                https://github.com/{contributor()!.login}
              </ExternalLink>
            </div>
          </div>
        </div>

        <div class="py-0 py-md-2">
          <div class={`lh-1 text-muted ${styles.subtitle}`}>
            <span class="fw-bold">{prettifyNumber(contributor()!.contributions, 1)}</span>{' '}
            {contributor()!.contributions === 1 ? 'contribution' : 'contributions'} to{' '}
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
              <div class={`d-flex flex-column ${styles.firstContribContent}`}>
                <div class={`fw-bold text-truncate w-100 ${styles.firstContributionRepo}`}>
                  {contributor()!.first_contribution.owner}/{contributor()!.first_contribution.repository}
                </div>
                <div class={`fw-semibold my-1 text-truncate w-100 ${styles.firstContributionLink}`}>
                  {contributor()!.first_contribution.title}
                </div>
                <div class="text-muted">
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
            <Badges items={contributor()!.repositories} />
          </div>

          <div class={`mt-4 pt-0 pt-md-3 mb-2 ${styles.message}`}>Thank you for your contributions!</div>
        </div>
      </Show>
    </Show>
  );
};

export default ContributorCard;
