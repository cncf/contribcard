import { JSXElement } from 'solid-js';

import styles from './ExternalLink.module.css';

interface Props {
  children: JSXElement | JSXElement[] | string;
  href: string;
  class?: string;
  label?: string;
  title?: string;
  underlined: boolean;
}

const ExternalLink = (props: Props) => {
  return (
    <a
      title={props.title}
      class={`${styles.link} ${props.class}`}
      classList={{ [styles.highlighted]: props.underlined }}
      href={props.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={props.label || 'Open external link'}
      tabIndex={-1}
    >
      {props.children}
    </a>
  );
};

export default ExternalLink;
