import React from 'react';

function splitText(text) {
  if (!text) return [];
  const regex = /(https?:\/\/[^\s]+)|(@[a-zA-Z0-9_\.]+)|(#\w+)/g;
  const out = [];
  let lastIndex = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) out.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    if (m[1]) out.push({ type: 'url', value: m[1] });
    else if (m[2]) out.push({ type: 'mention', value: m[2] });
    else if (m[3]) out.push({ type: 'hashtag', value: m[3] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) out.push({ type: 'text', value: text.slice(lastIndex) });
  return out;
}

export default function AutolinkText({ text, onMentionClick, onHashtagClick }) {
  const parts = splitText(text);
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'url') {
          return (
            <a key={i} href={p.value} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:underline break-words">
              {p.value}
            </a>
          );
        }
        if (p.type === 'mention') {
          const handle = p.value.slice(1);
          return (
            <button
              key={i}
              type="button"
              className="text-[#0A66C2] hover:underline"
              onClick={() => onMentionClick && onMentionClick(handle)}
            >
              {p.value}
            </button>
          );
        }
        if (p.type === 'hashtag') {
          const tag = p.value.slice(1);
          return (
            <button
              key={i}
              type="button"
              className="text-[#0A66C2] hover:underline"
              onClick={() => onHashtagClick && onHashtagClick(tag)}
              title={`View posts tagged #${tag}`}
            >
              {p.value}
            </button>
          );
        }
        return <span key={i}>{p.value}</span>;
      })}
    </>
  );
}
