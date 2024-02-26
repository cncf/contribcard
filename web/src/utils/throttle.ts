const throttle = (callback: () => void, wait: number) => {
  let isThrottled = false,
    timeoutId: ReturnType<typeof setTimeout>,
    lastArgs: Parameters<typeof callback>;

  const throttled: typeof callback = (...args) => {
    lastArgs = args;
    if (isThrottled) return;
    isThrottled = true;
    timeoutId = setTimeout(() => {
      callback(...lastArgs);
      isThrottled = false;
    }, wait);
  };

  const clear = () => {
    clearTimeout(timeoutId);
    isThrottled = false;
  };

  return Object.assign(throttled, { clear });
};

export default throttle;
