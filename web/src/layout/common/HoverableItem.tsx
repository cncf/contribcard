import { JSXElement } from 'solid-js';

interface Props {
  children: JSXElement | JSXElement[] | string;
  class?: string;
  onHover?: () => void;
  onLeave?: () => void;
}

const HoverableItem = (props: Props) => (
  <div
    class={props.class}
    onMouseEnter={() => {
      if (props.onHover) {
        props.onHover();
      }
    }}
    onMouseLeave={() => {
      if (props.onLeave) {
        props.onLeave();
      }
    }}
  >
    {props.children}
  </div>
);

export default HoverableItem;
