import { createEffect, createSignal, For, on, onMount } from 'solid-js';

import styles from './Badges.module.css';

interface Props {
  items: (string | number)[];
  sorted?: boolean;
}

const Badges = (props: Props) => {
  const [items, setItems] = createSignal<(string | number)[]>();
  const [hiddenItems, setHiddenItems] = createSignal<number | undefined>();
  const [elements, setElements] = createSignal<HTMLDivElement[]>();
  const [lastVisibleItem, setLastVisibleItem] = createSignal<HTMLDivElement>();

  createEffect(() => {
    if (elements() && hiddenItems() === undefined) {
      let numHiddenItems: number = 0;
      elements()!.forEach((i: HTMLDivElement) => {
        if (i.offsetTop !== 0) {
          numHiddenItems = numHiddenItems + 1;
        }
      });
      setHiddenItems(numHiddenItems);
    }
  });

  createEffect(
    on(hiddenItems, () => {
      if (hiddenItems() !== undefined && hiddenItems()! > 0) {
        const item = elements()![elements()!.length - hiddenItems()! - 1];
        setLastVisibleItem(item);
      }
    })
  );

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

  return (
    <div class={styles.wrapper}>
      <div class="d-flex flex-row flex-wrap align-items-center mt-2 position-relative">
        <For each={items()}>
          {(i: string | number) => {
            return (
              <div ref={(el) => setElements([...(elements() || []), el])} class={`me-2 ${styles.badge}`}>
                {i}
              </div>
            );
          }}
        </For>
        {hiddenItems() !== undefined && hiddenItems()! > 0 && lastVisibleItem() !== undefined && (
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
