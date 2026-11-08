import Script from "next/script";

/** Kwop visit tracking: public pages only (landing, sign-up, log-in). */
export function KwopFlow() {
  return <Script src="https://kwop.io/flow.js" data-site="s_9bce98191c" strategy="lazyOnload" />;
}
