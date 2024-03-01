import { createElementSize } from '@solid-primitives/resize-observer';
import { batch, createEffect, createSignal, For, onMount } from 'solid-js';

import styles from './Badges.module.css';

interface Props {
  items: (string | number)[];
  sorted?: boolean;
  withTitle?: boolean;
}

const MAX_ITEMS = 10;

const Badges = (props: Props) => {
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const [items, setItems] = createSignal<(string | number)[]>();
  const [hiddenItems, setHiddenItems] = createSignal<number>(0);
  const [elements, setElements] = createSignal<HTMLDivElement[]>();
  const [lastVisibleItem, setLastVisibleItem] = createSignal<HTMLDivElement>();
  const [initialWidth, setInitialWidth] = createSignal<number>(0);
  const [initialHeight, setInitialHeight] = createSignal<number>(0);
  const size = createElementSize(container);
  const width = () => size.width;
  const height = () => size.height;
  const withAlt = () => props.withTitle !== undefined && props.withTitle;

  createEffect(() => {
    if (
      elements() &&
      width() !== null &&
      height() !== null &&
      (width() !== initialWidth() || height() !== initialHeight())
    ) {
      setInitialWidth(width()!);
      setInitialHeight(height()!);
      setLastVisibleItem();
      checkElements();
    }
  });

  const checkElements = () => {
    if (elements()) {
      let numVisibleItems: number = 0;
      elements()!.forEach((i: HTMLDivElement) => {
        if (i.offsetTop === 0) {
          numVisibleItems = numVisibleItems + 1;
        }
      });
      const numHiddenItems = props.items.length - numVisibleItems;

      batch(() => {
        setHiddenItems(numHiddenItems);
        if (numHiddenItems > 0) {
          const item = elements()![numVisibleItems - 1];
          setLastVisibleItem(item);
        }
      });
    }
  };

  onMount(() => {
    if (props.sorted !== undefined && props.sorted) {
      const tmp = (props.items as number[]).sort((a, b) => {
        return b - a;
      });
      setItems(tmp);
    } else {
      setItems(props.items);
    }
  });

  const getValue = (text: string): string => {
    const splittedRepo = text.split('/');
    return splittedRepo.length === 1 ? text : splittedRepo[1];
  };

  return (
    <div ref={setContainer} class={styles.wrapper}>
      <div class="d-flex flex-row flex-wrap align-items-center mt-2 position-relative">
        <For each={[...(items() || [])].splice(0, MAX_ITEMS)}>
          {(i: string | number) => {
            return (
              <div
                ref={(el) => setElements([...(elements() || []), el])}
                class={`me-2 ${styles.badge}`}
                title={withAlt() ? (i as string) : undefined}
              >
                {withAlt() ? getValue(i as string) : i}
              </div>
            );
          }}
        </For>
        {hiddenItems() > 0 && lastVisibleItem() !== undefined && (
          <div
            class={styles.hiddenItems}
            style={{ left: `${lastVisibleItem()!.offsetLeft + lastVisibleItem()!.clientWidth + 10}px` }}
          >
            +{hiddenItems()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Badges;
