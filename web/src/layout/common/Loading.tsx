import { JSXElement, Show } from 'solid-js';

import styles from './Loading.module.css';

interface Props {
  class?: string;
  spinnerClass?: string;
  smallSize?: boolean;
  transparentBg?: boolean;
  noWrapper?: boolean;
}

const Loading = (props: Props) => {
  const getSpinner = (): JSXElement => {
    return (
      <div class="d-flex justify-content-center">
        <div
          class={`${styles.wave} ${props.spinnerClass}`}
          classList={{ [styles.miniWave]: props.smallSize !== undefined && props.smallSize }}
          role="status"
        />
      </div>
    );
  };

  return (
    <Show when={props.noWrapper === undefined || !props.noWrapper} fallback={<>{getSpinner()}</>}>
      <div
        class={`h-100 d-flex ${styles.wrapper} ${props.class}`}
        classList={{
          'p-5': props.smallSize === undefined || !props.smallSize,
          [styles.transparentBg]: props.transparentBg !== undefined && props.transparentBg,
        }}
      >
        <div class={props.spinnerClass || 'd-flex flex-row align-items-center justify-content-center w-100 h-100'}>
          {getSpinner()}
        </div>
      </div>
    </Show>
  );
};

export default Loading;
