import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';

import { useContributorsDataInfo, useContributorsDataList } from '../../stores/contributorsData';
import prettifyNumber from '../../utils/prettifyNumber';
import updateMetaTags from '../../utils/updateMetaTags';
import HoverableItem from '../common/HoverableItem';
import Image from '../common/Image';
import styles from './Search.module.css';

const SEARCH_DELAY = 2 * 100; // 200ms
const MIN_CHARACTERS_SEARCH = 3;
const MAX_CONTRIBUTORS = 10;

const Search = () => {
  const navigate = useNavigate();
  const currentContributors = useContributorsDataList();
  const contributorsInfo = useContributorsDataInfo();
  const [inputEl, setInputEl] = createSignal<HTMLInputElement>();
  const [dropdownRef, setDropdownRef] = createSignal<HTMLInputElement>();
  const [value, setValue] = createSignal<string>('');
  const [visibleContributors, setVisibleContributors] = createSignal<string[] | null>(null);
  const [visibleDropdown, setVisibleDropdown] = createSignal<boolean>(false);
  const [highlightedContributor, setHighlightedContributor] = createSignal<number | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = createSignal<number | null>(null);
  const [searchingResults, setSearchingResults] = createSignal<boolean>(false);

  const onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Escape':
        cleanItemsSearch();
        setValue('');
        return;
      case 'ArrowDown':
        updateHighlightedItem('down');
        return;
      case 'ArrowUp':
        updateHighlightedItem('up');
        return;
      case 'Enter':
        e.preventDefault();
        if (visibleContributors() !== null && highlightedContributor() !== null) {
          const selectedContributor = visibleContributors()![highlightedContributor()!];
          if (selectedContributor) {
            loadContributor(selectedContributor);
          }
        } else {
          if (value() !== '') {
            loadContributor(value());
          }
        }
        return;
      default:
        return;
    }
  };

  const forceBlur = (): void => {
    if (inputEl()) {
      inputEl()!.blur();
    }
  };

  const onSearch = (text: string) => {
    const lowerText = text.toLowerCase();
    let counter = 0;
    const filteredContributors = currentContributors()!.filter((c: string) => {
      if (counter < MAX_CONTRIBUTORS && c.toLowerCase().startsWith(lowerText)) {
        counter++;
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
    setSearchingResults(false);
  };

  const cleanTimeout = () => {
    if (dropdownTimeout() !== null) {
      clearTimeout(dropdownTimeout()!);
      setDropdownTimeout(null);
    }
  };

  const cleanItemsSearch = () => {
    setVisibleContributors(null);
    setVisibleDropdown(false);
    setHighlightedContributor(null);
  };

  const loadContributor = (contributorId: string) => {
    cleanItemsSearch();
    setValue('');
    forceBlur();
    navigate(`/${contributorId}`, {
      replace: false,
      scroll: true, // default
    });
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
    const element = document.getElementById(`card_${index}`);
    if (element && dropdownRef() !== undefined) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  };

  createEffect(
    on(value, () => {
      const isInputFocused = inputEl() === document.activeElement;
      if (isInputFocused) {
        if (value().length >= MIN_CHARACTERS_SEARCH) {
          setSearchingResults(true);
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
    updateMetaTags();
    setVisibleContributors(currentContributors()!);
  });

  return (
    <div class="mt-5">
      <div class={`mb-4 pb-2 ${styles.searchTitle}`}>Find your contributor card</div>

      <div class="position-relative">
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
            placeholder="Search by username"
            onKeyDown={onKeyDown}
            onInput={(e) => setValue(e.target.value)}
          />
          <div class={styles.searchIcon}>
            <Show
              when={!searchingResults()}
              fallback={
                <div class={`position-absolute ${styles.searchingWrapper}`}>
                  <div class={`spinner-border ${styles.searchingSpinner}`} role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                </div>
              }
            >
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
            </Show>
          </div>
        </div>
        <Show when={currentContributors()}>
          <div class={styles.countingMessage}>
            <span class={`fw-bold ${styles.countingNumber}`}>{prettifyNumber(currentContributors()!.length, 1)}</span>{' '}
            contributors and counting!
          </div>
        </Show>
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
                        class={`w-100 p-2 p-md-3 position-relative ${styles.btn}`}
                        classList={{
                          activeDropdownItem: index() === highlightedContributor(),
                        }}
                        onClick={() => {
                          loadContributor(c);
                        }}
                        id={`card_${index()}`}
                      >
                        <div class="d-flex flex-row align-items-center">
                          <div class={`me-4 text-muted avatar ${styles.miniAvatar}`}>
                            <Image contributorId={contributorsInfo()![c]} login={c} class="d-block w-100 h-100 mask" />
                          </div>
                          <div class={`fw-semibold text-truncate ${styles.displayName}`}>{c}</div>
                        </div>
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
