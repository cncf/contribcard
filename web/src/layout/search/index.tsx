import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';

import { useContributorsDataContent } from '../../stores/contributorsData';
import { useSelectedContributorId, useSetSelectedContributorId } from '../../stores/selectedContributor';
import { ContributorBase } from '../../types';
import HoverableItem from '../common/HoverableItem';
import styles from './Search.module.css';

const SEARCH_DELAY = 3 * 100; // 300ms
const MIN_CHARACTERS_SEARCH = 3;

const Search = () => {
  const currentContributors = useContributorsDataContent();
  const selectedContributorId = useSelectedContributorId();
  const setContributorId = useSetSelectedContributorId();
  const [inputEl, setInputEl] = createSignal<HTMLInputElement>();
  const [dropdownRef, setDropdownRef] = createSignal<HTMLInputElement>();
  const [value, setValue] = createSignal<string>('');
  const [visibleContributors, setVisibleContributors] = createSignal<ContributorBase[] | null>(null);
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [highlightedContributor, setHighlightedContributor] = createSignal<number | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = createSignal<number | null>(null);

  const onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Escape':
        cleanItemsSearch();
        return;
      case 'ArrowDown':
        updateHighlightedItem('down');
        return;
      case 'ArrowUp':
        updateHighlightedItem('up');
        return;
      case 'Enter':
        e.preventDefault();
        if (value() !== '') {
          cleanTimeout();
          cleanItemsSearch();
          setContributorId(value());
        }
        return;
      default:
        return;
    }
  };

  const onSearch = (text: string) => {
    const lowerText = text.toLowerCase();
    const filteredContributors = currentContributors()!.filter((c: ContributorBase) => {
      if (c.login.toLowerCase().startsWith(lowerText)) {
        return c;
      }
    });
    if (filteredContributors.length > 0) {
      const isInputFocused = inputEl() === document.activeElement;
      // We have to be sure that input has focus to display results
      if (isInputFocused) {
        setVisibleContributors(filteredContributors);
        setVisibleDropdown(true);
      } else {
        cleanItemsSearch();
      }
    } else {
      setVisibleContributors([]);
      setVisibleDropdown(true);
    }
  };

  const cleanTimeout = () => {
    if (dropdownTimeout() !== null) {
      clearTimeout(dropdownTimeout()!);
      setDropdownTimeout(null);
    }
  };

  // const cleanSearchValue = () => {
  //   setValue('');
  //   forceFocus();
  // };

  const cleanItemsSearch = () => {
    setVisibleContributors(null);
    setVisibleDropdown(false);
    setHighlightedContributor(null);
  };

  const updateHighlightedItem = (arrow: 'up' | 'down') => {
    if (visibleContributors() !== null && visibleDropdown()) {
      if (highlightedContributor() !== null) {
        let newIndex: number = arrow === 'up' ? highlightedContributor()! - 1 : highlightedContributor()! + 1;
        if (newIndex > visibleContributors()!.length) {
          newIndex = 0;
        }
        if (newIndex < 0) {
          newIndex = visibleContributors()!.length;
        }
        setHighlightedContributor(newIndex);
        scrollToHighlightedItem(newIndex);
      } else {
        if (visibleContributors() && visibleContributors()!.length > 0) {
          const newIndex = arrow === 'up' ? visibleContributors()!.length - 1 : 0;
          setHighlightedContributor(newIndex);
          scrollToHighlightedItem(newIndex);
        }
      }
    }
  };

  const scrollToHighlightedItem = (index: number) => {
    const element = document.getElementById(`sl-opt${index}`);
    if (element && dropdownRef() !== undefined) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  };

  createEffect(
    on(value, () => {
      const isInputFocused = inputEl() === document.activeElement;
      if (isInputFocused) {
        if (value().length >= MIN_CHARACTERS_SEARCH) {
          cleanTimeout();
          setDropdownTimeout(
            setTimeout(() => {
              setHighlightedContributor(null);
              onSearch(value());
            }, SEARCH_DELAY)
          );
        } else {
          cleanItemsSearch();
        }
      }
    })
  );

  onCleanup(() => {
    if (dropdownTimeout() !== null) {
      clearTimeout(dropdownTimeout()!);
    }
  });

  onMount(() => {
    setVisibleContributors(currentContributors()!);
  });

  return (
    <div class="mt-5">
      <div class={`fs-2 mb-4 pb-2 ${styles.searchTitle}`}>Find your contributor card</div>

      <div class={`position-relative ${styles.searchWrapper}`}>
        <div class={`d-flex align-items-center overflow-hidden lh-base bg-white ${styles.searchBar}`}>
          <input
            ref={setInputEl}
            class={`flex-grow-1 ps-3 ${styles.input}`}
            type="text"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none"
            spellcheck={false}
            value={value()}
            placeholder="Search contributors"
            onKeyDown={onKeyDown}
            onInput={(e) => setValue(e.target.value)}
          />
          <div class={styles.searchIcon}>
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
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
        <Show when={visibleDropdown() && visibleContributors() !== null}>
          <div
            ref={setDropdownRef}
            class={`dropdown-menu dropdown-menu-left p-0 shadow-sm rounded-0 mt-2 w-100 show ${styles.dropdown}`}
          >
            <Show
              fallback={
                <div class={`p-4 text-muted ${styles.emptyMessage}`}>
                  We can't seem to find any contributors that match your search for{' '}
                  <span class={styles.searchValue}>{value()}</span>.
                </div>
              }
              when={visibleContributors()!.length > 0}
            >
              <For each={visibleContributors()}>
                {(c, index) => {
                  return (
                    <HoverableItem
                      class={styles.item}
                      onHover={() => setHighlightedContributor(index())}
                      onLeave={() => setHighlightedContributor(null)}
                    >
                      <div
                        role="button"
                        class={`w-100 p-3 position-relative ${styles.btn}`}
                        classList={{
                          activeDropdownItem: index() === highlightedContributor(),
                        }}
                        onClick={() => setContributorId(c.login)}
                      >
                        <div class="d-flex flex-row align-items-center">
                          <div class={`me-4 avatar ${styles.miniAvatar}`}>
                            <img
                              class="d-block w-100 h-100 mask"
                              src={`https://avatars.githubusercontent.com/u/${c.id}`}
                              alt="Avatar"
                            />
                          </div>
                          <div class={`fw-semibold text-truncate ${styles.displayName}`}>{c.login}</div>
                        </div>
                        <Show when={selectedContributorId() === c.login}>
                          <div class={`position-absolute ${styles.loading}`}>
                            <div class={`spinner-border spinner-border-sm ${styles.spinner}`} role="status">
                              <span class="visually-hidden">Loading...</span>
                            </div>
                          </div>
                        </Show>
                      </div>
                    </HoverableItem>
                  );
                }}
              </For>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default Search;