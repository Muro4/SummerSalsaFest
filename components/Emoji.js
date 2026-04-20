"use client";

import ReactTwemoji from 'react-twemoji';

// Safely handle Next.js ESM/CommonJS import mismatch
const Twemoji = ReactTwemoji.default ? ReactTwemoji.default : ReactTwemoji;

export default function Emoji({ children, className = "" }) {
  return (
    <Twemoji options={{ className: 'inline-emoji', folder: 'svg', ext: '.svg' }} className={className}>
      {children}
    </Twemoji>
  );
}