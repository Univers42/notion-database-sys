// ═══════════════════════════════════════════════════════════════════════════════
// SlashCommandMenu — Notion-style "/" command palette
// ═══════════════════════════════════════════════════════════════════════════════
//
// Appears when the user types "/" in a block. Shows categorized block types
// with icons, labels, and markdown shortcut hints. Supports:
//   - Arrow key navigation
//   - Type-ahead filtering
//   - Enter to select, Esc to close
//   - Positioned at caret via getBoundingClientRect
//
// Item catalog matches the Notion panel from the user's HTML reference:
//   Basic blocks: Text, H1-H4, Bullet, Numbered, To-do, Toggle, Page,
//                 Callout, Quote, Table, Divider, Link to page
//   Media: Image, Video, Audio, Code, File, Web bookmark
//   Database: Table view, Board view, Gallery view, List view
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { BlockType } from '../../types/database';

// ─── Menu item definition ─────────────────────────────────────────────────────

export interface SlashMenuItem {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  section: 'basic' | 'media' | 'database';
  keywords?: string[];
}

// ─── SVG Icons (inline, matching Notion's 20×20 viewBox) ──────────────────────

function IconText() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M4.875 4.825c0-.345.28-.625.625-.625h9c.345 0 .625.28.625.625v1.8a.625.625 0 1 1-1.25 0V5.45h-3.25v9.1h.725a.625.625 0 1 1 0 1.25h-2.7a.625.625 0 1 1 0-1.25h.725v-9.1h-3.25v1.175a.625.625 0 1 1-1.25 0z" />
    </svg>
  );
}

function IconH1() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M4.1 4.825a.625.625 0 0 0-1.25 0v10.35a.625.625 0 0 0 1.25 0V10.4h6.4v4.775a.625.625 0 0 0 1.25 0V4.825a.625.625 0 1 0-1.25 0V9.15H4.1zM17.074 8.45a.6.6 0 0 1 .073.362q.003.03.003.063v6.3a.625.625 0 1 1-1.25 0V9.802l-1.55.846a.625.625 0 1 1-.6-1.098l2.476-1.35a.625.625 0 0 1 .848.25" />
    </svg>
  );
}

function IconH2() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M3.65 4.825a.625.625 0 1 0-1.25 0v10.35a.625.625 0 0 0 1.25 0V10.4h6.4v4.775a.625.625 0 0 0 1.25 0V4.825a.625.625 0 1 0-1.25 0V9.15h-6.4zm10.104 5.164c.19-.457.722-.84 1.394-.84.89 0 1.48.627 1.48 1.238 0 .271-.104.53-.302.746l-3.837 3.585a.625.625 0 0 0 .427 1.082h4.5a.625.625 0 1 0 0-1.25H14.5l2.695-2.518.027-.028c.406-.43.657-.994.657-1.617 0-1.44-1.299-2.488-2.731-2.488-1.128 0-2.145.643-2.548 1.608a.625.625 0 0 0 1.154.482" />
    </svg>
  );
}

function IconH3() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M2.877 4.2c.346 0 .625.28.625.625V9.15h6.4V4.825a.625.625 0 0 1 1.25 0v10.35a.625.625 0 0 1-1.25 0V10.4h-6.4v4.775a.625.625 0 0 1-1.25 0V4.825c0-.345.28-.625.625-.625M14.93 9.37c-.692 0-1.183.34-1.341.671a.625.625 0 1 1-1.128-.539c.416-.87 1.422-1.382 2.47-1.382.686 0 1.33.212 1.818.584.487.373.843.932.843 1.598 0 .629-.316 1.162-.76 1.533l.024.018c.515.389.892.972.892 1.669 0 .696-.377 1.28-.892 1.668s-1.198.61-1.926.61c-1.1 0-2.143-.514-2.599-1.389a.625.625 0 0 1 1.109-.578c.187.36.728.717 1.49.717.482 0 .895-.148 1.174-.358s.394-.453.394-.67-.116-.46-.394-.67c-.28-.21-.692-.358-1.174-.358h-.461a.625.625 0 0 1 0-1.25h.357a1 1 0 0 1 .104-.01c.437 0 .81-.135 1.06-.326s.351-.41.351-.605-.101-.415-.351-.606-.623-.327-1.06-.327" />
    </svg>
  );
}

function IconH4() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M15.43 8.22c.663-.622 1.779-.162 1.779.776v3.644h.513a.625.625 0 0 1 0 1.25h-.513v1.329a.625.625 0 0 1-1.25 0v-1.33H12.75a.625.625 0 0 1-.625-.624v-.008a.55.55 0 0 1 .092-.347l3.072-4.524.01-.015.027-.039.02-.025.02-.026.012-.011zm-1.7 4.42h2.229V9.357zM10.527 4.2c.345 0 .625.28.625.625v4.94l.001.01v5.4a.626.626 0 0 1-1.25 0V10.4h-6.4v4.775a.626.626 0 0 1-1.251 0V4.825a.626.626 0 0 1 1.25 0V9.15h6.4V4.825c0-.345.28-.625.625-.625" />
    </svg>
  );
}

function IconBullet() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M4.809 12.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M16 13.375a.625.625 0 1 1 0 1.25H8.5a.625.625 0 0 1 0-1.25zM4.809 4.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M16 5.375a.625.625 0 1 1 0 1.25H8.5a.625.625 0 0 1 0-1.25z" />
    </svg>
  );
}

function IconNumbered() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M5.088 3.026a.55.55 0 0 1 .27.474v4a.55.55 0 0 1-1.1 0V4.435l-.24.134a.55.55 0 1 1-.535-.962l1.059-.588a.55.55 0 0 1 .546.007M8.5 5.375a.625.625 0 1 0 0 1.25H16a.625.625 0 1 0 0-1.25zm0 8a.625.625 0 0 0 0 1.25H16a.625.625 0 1 0 0-1.25zM6 16.55H3.5a.55.55 0 0 1-.417-.908l1.923-2.24a.7.7 0 0 0 .166-.45.335.335 0 0 0-.266-.327l-.164-.035a.6.6 0 0 0-.245.004l-.03.007a.57.57 0 0 0-.426.44.55.55 0 1 1-1.08-.206 1.67 1.67 0 0 1 1.248-1.304l.029-.007c.24-.058.49-.061.732-.01l.164.035c.664.14 1.138.726 1.138 1.404 0 .427-.153.84-.432 1.165L4.697 15.45H6a.55.55 0 0 1 0 1.1" />
    </svg>
  );
}

function IconTodo() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M6.184 10.804a1.1 1.1 0 0 1 1.1 1.1v2.8a1.1 1.1 0 0 1-1.1 1.1h-2.8a1.1 1.1 0 0 1-1.1-1.1v-2.8a1.1 1.1 0 0 1 1.1-1.1zm-2.65 3.75h2.5v-2.5h-2.5zm13.339-1.875a.625.625 0 0 1 0 1.25H9.748a.625.625 0 1 1 0-1.25zM6.748 3.394a.625.625 0 0 1 1.072.642l-2.85 4.75a.626.626 0 0 1-1.01.086l-1.9-2.217a.626.626 0 0 1 .948-.813l1.336 1.557zm10.125 2.634a.626.626 0 0 1 0 1.25H9.748a.625.625 0 1 1 0-1.25z" />
    </svg>
  );
}

function IconToggle() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M2.7 7.519c0 .39.421.633.757.436L6.05 6.437a.506.506 0 0 0 0-.874L3.457 4.045a.503.503 0 0 0-.757.436zm5.8-2.144a.625.625 0 1 0 0 1.25H16a.625.625 0 1 0 0-1.25zm0 8a.625.625 0 1 0 0 1.25H16a.625.625 0 1 0 0-1.25zm-5.043 2.58a.503.503 0 0 1-.757-.436V12.48c0-.39.421-.633.757-.436l2.593 1.518a.506.506 0 0 1 0 .874z" />
    </svg>
  );
}

function IconPage() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M13.3 14.25a.55.55 0 0 1-.55.55h-5.5a.55.55 0 1 1 0-1.1h5.5a.55.55 0 0 1 .55.55m-.55-1.95a.55.55 0 1 0 0-1.1h-5.5a.55.55 0 0 0 0 1.1z" />
      <path d="M6.25 2.375A2.125 2.125 0 0 0 4.125 4.5v11c0 1.174.951 2.125 2.125 2.125h7.5a2.125 2.125 0 0 0 2.125-2.125V8.121c0-.563-.224-1.104-.622-1.502L11.63 2.997a2.13 2.13 0 0 0-1.502-.622zM5.375 4.5c0-.483.392-.875.875-.875h3.7V6.25A2.05 2.05 0 0 0 12 8.3h2.625v7.2a.875.875 0 0 1-.875.875h-7.5a.875.875 0 0 1-.875-.875zm8.691 2.7H12a.95.95 0 0 1-.95-.95V4.184z" />
    </svg>
  );
}

function IconCallout() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M13.276 5.766a.6.6 0 0 1 .11.033l.034.017.067.037q.019.012.036.026l.051.042q.018.015.033.034a.6.6 0 0 1 .107.158l.014.03q.046.11.047.235v1.26a.626.626 0 0 1-1.25 0v-.635h-1.9v5.994h.32l.125.013a.625.625 0 0 1 0 1.224l-.126.013h-.934l-.01.001h-.945a.625.625 0 0 1 0-1.25h.32V7.002h-1.9v.635a.626.626 0 0 1-1.25 0v-1.26a.625.625 0 0 1 .626-.625h6.3z" />
      <path d="M14.75 3.125c1.174 0 2.125.951 2.125 2.125v9.5a2.125 2.125 0 0 1-2.125 2.125h-9.5a2.125 2.125 0 0 1-2.125-2.125v-9.5c0-1.174.951-2.125 2.125-2.125zm-9.5 1.25a.875.875 0 0 0-.875.875v9.5c0 .483.392.875.875.875h9.5a.875.875 0 0 0 .875-.875v-9.5a.875.875 0 0 0-.875-.875z" />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M15.796 4.971a5.067 5.067 0 0 0-5.067 5.067v.635a4.433 4.433 0 0 0 4.433 4.433 3.164 3.164 0 1 0-3.11-3.75 3.2 3.2 0 0 1-.073-.683v-.635a3.817 3.817 0 0 1 3.817-3.817h.635a.625.625 0 1 0 0-1.25zm-9.054 0a5.067 5.067 0 0 0-5.067 5.068v.634a4.433 4.433 0 0 0 4.433 4.433 3.164 3.164 0 1 0-3.11-3.75 3.2 3.2 0 0 1-.073-.683v-.634A3.817 3.817 0 0 1 6.742 6.22h.635a.625.625 0 1 0 0-1.25z" />
    </svg>
  );
}

function IconTable() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M4.5 4.125A2.125 2.125 0 0 0 2.375 6.25v7.5c0 1.174.951 2.125 2.125 2.125h11a2.125 2.125 0 0 0 2.125-2.125v-7.5A2.125 2.125 0 0 0 15.5 4.125zm11.875 7h-5.75v-2.25h5.75zm-5.75 1.25h5.75v1.375a.875.875 0 0 1-.875.875h-4.875zm-1.25-1.25h-5.75v-2.25h5.75zm-5.75 1.25h5.75v2.25H4.5a.875.875 0 0 1-.875-.875zm0-4.75V6.25c0-.483.392-.875.875-.875h4.875v2.25zm7 0v-2.25H15.5c.483 0 .875.392.875.875v1.375z" />
    </svg>
  );
}

function IconDivider() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M4 9.375a.625.625 0 1 0 0 1.25h12a.625.625 0 1 0 0-1.25z" />
    </svg>
  );
}

function IconLinkToPage() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M6.25 2.375A2.125 2.125 0 0 0 4.125 4.5v11c0 1.174.951 2.125 2.125 2.125h1.453c.04-.45.217-.89.533-1.25H6.25a.875.875 0 0 1-.875-.875v-11c0-.483.392-.875.875-.875h3.7V6.25A2.05 2.05 0 0 0 12 8.3h2.625v1.208h1.25V8.12c0-.563-.224-1.104-.622-1.502L11.63 2.997a2.13 2.13 0 0 0-1.502-.622zM14.066 7.2H12a.95.95 0 0 1-.95-.95V4.184z" />
      <path d="M11.636 11.046h4.37c.361 0 .655.294.655.656v4.369a.656.656 0 1 1-1.311 0v-2.786l-4.998 4.997a.656.656 0 0 1-.927-.927l4.997-4.997h-2.786a.656.656 0 0 1 0-1.312" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M8.5 9.31a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" />
      <path d="M2.375 6.25c0-1.174.951-2.125 2.125-2.125h11c1.174 0 2.125.951 2.125 2.125v7.5a2.125 2.125 0 0 1-2.125 2.125h-11a2.125 2.125 0 0 1-2.125-2.125zM4.5 5.375a.875.875 0 0 0-.875.875v5.491l1.996-1.995a.625.625 0 0 1 .883 0l1.98 1.98 4.137-4.137a.625.625 0 0 1 .883 0l2.871 2.87V6.25a.875.875 0 0 0-.875-.875zm11.875 6.852-3.312-3.312-4.137 4.136a.625.625 0 0 1-.884 0l-1.98-1.98-2.437 2.438v.241c0 .483.392.875.875.875h11a.875.875 0 0 0 .875-.875z" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M7.814 12.407c0 .295.323.479.58.33l4.165-2.407a.38.38 0 0 0 0-.66L8.394 7.263a.385.385 0 0 0-.58.33z" />
      <path d="M4.5 4.125A2.125 2.125 0 0 0 2.375 6.25v7.5c0 1.174.951 2.125 2.125 2.125h11a2.125 2.125 0 0 0 2.125-2.125v-7.5A2.125 2.125 0 0 0 15.5 4.125zM3.625 6.25c0-.483.392-.875.875-.875h11c.483 0 .875.392.875.875v7.5a.875.875 0 0 1-.875.875h-11a.875.875 0 0 1-.875-.875z" />
    </svg>
  );
}

function IconAudio() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M9.207 3.197c.619-.578 1.63-.14 1.63.708v12.417c0 .847-1.011 1.286-1.63.708l-3.523-3.291H2.712a.625.625 0 0 1-.625-.625v-6c0-.346.28-.625.625-.625h2.972zm.38 1.356L6.357 7.57a.63.63 0 0 1-.426.169H3.337v4.75H5.93c.158 0 .31.06.426.168l3.23 3.017zm3.224 2.08a.625.625 0 0 1 .88.08 5.31 5.31 0 0 1 0 6.8.625.625 0 0 1-.96-.8 4.06 4.06 0 0 0 0-5.2.625.625 0 0 1 .08-.88" />
      <path d="M16.224 4.755a.625.625 0 0 0-1.024.717 8.09 8.09 0 0 1 0 9.283.625.625 0 0 0 1.024.717 9.34 9.34 0 0 0 0-10.717" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M12.6 3.172a.625.625 0 0 0-1.201-.344l-4 14a.625.625 0 0 0 1.202.344zM5.842 5.158a.625.625 0 0 1 0 .884L1.884 10l3.958 3.958a.625.625 0 0 1-.884.884l-4.4-4.4a.625.625 0 0 1 0-.884l4.4-4.4a.625.625 0 0 1 .884 0m8.316 0a.625.625 0 0 1 .884 0l4.4 4.4a.625.625 0 0 1 0 .884l-4.4 4.4a.625.625 0 0 1-.884-.884L18.116 10l-3.958-3.958a.625.625 0 0 1 0-.884" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M10.184 3.64A3.475 3.475 0 0 1 15.1 8.554l-5.374 5.374a2.05 2.05 0 1 1-2.9-2.9l2.688-2.686a.625.625 0 0 1 .884.884L7.71 11.913a.8.8 0 0 0 1.13 1.131l5.375-5.374a2.225 2.225 0 1 0-3.147-3.146L5.694 9.898a3.65 3.65 0 1 0 5.162 5.161l4.702-4.702a.625.625 0 0 1 .884.884l-4.702 4.702a4.9 4.9 0 1 1-6.93-6.93z" />
    </svg>
  );
}

function IconBookmark() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M4.125 4c0-1.174.951-2.125 2.125-2.125h7.5c1.174 0 2.125.951 2.125 2.125v12.502a1.125 1.125 0 0 1-1.799.9L10 14.356l-4.076 3.048a1.125 1.125 0 0 1-1.799-.901zm2.125-.875A.875.875 0 0 0 5.375 4v12.252l3.951-2.954c.4-.298.948-.298 1.348 0l3.951 2.954V4a.875.875 0 0 0-.875-.875z" />
    </svg>
  );
}

function IconBoard() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M2.375 6.25c0-1.174.951-2.125 2.125-2.125h11c1.174 0 2.125.951 2.125 2.125v7.5a2.125 2.125 0 0 1-2.125 2.125h-11a2.125 2.125 0 0 1-2.125-2.125zm10.584 8.375H15.5a.875.875 0 0 0 .875-.875v-7.5a.875.875 0 0 0-.875-.875h-2.541zm-1.25-9.25H8.292v9.25h3.417zm-7.209 0a.875.875 0 0 0-.875.875v7.5c0 .483.392.875.875.875h2.542v-9.25z" />
    </svg>
  );
}

function IconGallery() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M4 3.375c-.897 0-1.625.728-1.625 1.625v2.5c0 .897.728 1.625 1.625 1.625h3.5c.897 0 1.625-.728 1.625-1.625V5c0-.897-.728-1.625-1.625-1.625zM3.625 5c0-.207.168-.375.375-.375h3.5c.207 0 .375.168.375.375v2.5a.375.375 0 0 1-.375.375H4a.375.375 0 0 1-.375-.375zM4 10.875c-.897 0-1.625.727-1.625 1.625V15c0 .898.728 1.625 1.625 1.625h3.5c.897 0 1.625-.727 1.625-1.625v-2.5c0-.898-.728-1.625-1.625-1.625zM3.625 12.5c0-.207.168-.375.375-.375h3.5c.207 0 .375.168.375.375V15a.375.375 0 0 1-.375.375H4A.375.375 0 0 1 3.625 15zm7.25-7.5c0-.897.727-1.625 1.625-1.625H16c.898 0 1.625.728 1.625 1.625v2.5c0 .897-.727 1.625-1.625 1.625h-3.5A1.625 1.625 0 0 1 10.875 7.5zm1.625-.375a.375.375 0 0 0-.375.375v2.5c0 .207.168.375.375.375H16a.375.375 0 0 0 .375-.375V5A.375.375 0 0 0 16 4.625zm0 6.25c-.898 0-1.625.727-1.625 1.625V15c0 .898.727 1.625 1.625 1.625H16c.898 0 1.625-.727 1.625-1.625v-2.5c0-.898-.727-1.625-1.625-1.625zm-.375 1.625c0-.207.168-.375.375-.375H16c.207 0 .375.168.375.375V15a.375.375 0 0 1-.375.375h-3.5a.375.375 0 0 1-.375-.375z" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
      <path d="M7 4.375a.625.625 0 1 0 0 1.25h10.1a.625.625 0 1 0 0-1.25zm0 5a.625.625 0 1 0 0 1.25h10.1a.625.625 0 1 0 0-1.25zM6.375 15c0-.345.28-.625.625-.625h10.1a.625.625 0 1 1 0 1.25H7A.625.625 0 0 1 6.375 15M2.9 9.375a.625.625 0 1 0 0 1.25h1.5a.625.625 0 1 0 0-1.25zM2.275 5c0-.345.28-.625.625-.625h1.5a.625.625 0 1 1 0 1.25H2.9A.625.625 0 0 1 2.275 5m.625 9.375a.625.625 0 1 0 0 1.25h1.5a.625.625 0 1 0 0-1.25z" />
    </svg>
  );
}

// ─── Full item catalog ────────────────────────────────────────────────────────

export const SLASH_ITEMS: SlashMenuItem[] = [
  // ── Basic blocks
  { type: 'paragraph',      label: 'Text',           icon: <IconText />,       section: 'basic', keywords: ['text', 'paragraph', 'plain'] },
  { type: 'heading_1',      label: 'Heading 1',      icon: <IconH1 />,         section: 'basic', shortcut: '#',    keywords: ['heading', 'h1', 'title'] },
  { type: 'heading_2',      label: 'Heading 2',      icon: <IconH2 />,         section: 'basic', shortcut: '##',   keywords: ['heading', 'h2', 'subtitle'] },
  { type: 'heading_3',      label: 'Heading 3',      icon: <IconH3 />,         section: 'basic', shortcut: '###',  keywords: ['heading', 'h3'] },
  { type: 'heading_4',      label: 'Heading 4',      icon: <IconH4 />,         section: 'basic', shortcut: '####', keywords: ['heading', 'h4'] },
  { type: 'bulleted_list',  label: 'Bulleted list',  icon: <IconBullet />,     section: 'basic', shortcut: '-',    keywords: ['bullet', 'list', 'unordered'] },
  { type: 'numbered_list',  label: 'Numbered list',  icon: <IconNumbered />,   section: 'basic', shortcut: '1.',   keywords: ['number', 'list', 'ordered'] },
  { type: 'to_do',          label: 'To-do list',     icon: <IconTodo />,       section: 'basic', shortcut: '[]',   keywords: ['todo', 'checkbox', 'check', 'task'] },
  { type: 'toggle',         label: 'Toggle list',    icon: <IconToggle />,     section: 'basic', shortcut: '>',    keywords: ['toggle', 'collapse', 'expand'] },
  { type: 'page',           label: 'Page',           icon: <IconPage />,       section: 'basic',                   keywords: ['page', 'subpage'] },
  { type: 'callout',        label: 'Callout',        icon: <IconCallout />,    section: 'basic',                   keywords: ['callout', 'notice', 'alert'] },
  { type: 'quote',          label: 'Quote',          icon: <IconQuote />,      section: 'basic', shortcut: '"',    keywords: ['quote', 'blockquote'] },
  { type: 'table_block',    label: 'Table',          icon: <IconTable />,      section: 'basic',                   keywords: ['table', 'grid'] },
  { type: 'divider',        label: 'Divider',        icon: <IconDivider />,    section: 'basic', shortcut: '---',  keywords: ['divider', 'separator', 'hr'] },
  { type: 'link_to_page',   label: 'Link to page',   icon: <IconLinkToPage />, section: 'basic',                   keywords: ['link', 'page', 'reference'] },

  // ── Media
  { type: 'image',          label: 'Image',          icon: <IconImage />,      section: 'media',                   keywords: ['image', 'picture', 'photo'] },
  { type: 'video',          label: 'Video',          icon: <IconVideo />,      section: 'media',                   keywords: ['video', 'movie', 'clip'] },
  { type: 'audio',          label: 'Audio',          icon: <IconAudio />,      section: 'media',                   keywords: ['audio', 'sound', 'music'] },
  { type: 'code',           label: 'Code',           icon: <IconCode />,       section: 'media', shortcut: '```',  keywords: ['code', 'snippet', 'program'] },
  { type: 'file',           label: 'File',           icon: <IconFile />,       section: 'media',                   keywords: ['file', 'upload', 'attachment'] },
  { type: 'bookmark',       label: 'Web bookmark',   icon: <IconBookmark />,   section: 'media',                   keywords: ['bookmark', 'link', 'embed', 'web'] },

  // ── Database
  { type: 'database_inline',    label: 'Database - Inline',    icon: <IconTable />,   section: 'database', keywords: ['database', 'inline', 'table', 'spreadsheet', 'data'] },
  { type: 'database_full_page', label: 'Database - Full page', icon: <IconBoard />,   section: 'database', keywords: ['database', 'full', 'page', 'standalone'] },
];

const SECTION_LABELS: Record<string, string> = {
  basic: 'Basic blocks',
  media: 'Media',
  database: 'Database',
};

// ─── Component ────────────────────────────────────────────────────────────────

export interface SlashCommandMenuProps {
  position: { x: number; y: number };
  filter: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ position, filter, onSelect, onClose }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!filter) return SLASH_ITEMS;
    const q = filter.toLowerCase();
    return SLASH_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.type.includes(q) ||
      item.keywords?.some(k => k.includes(q))
    );
  }, [filter]);

  // Group by section
  const sections = useMemo(() => {
    const groups: Record<string, SlashMenuItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex].type);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-slash-index="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Calculate position: show above if too close to bottom
  const menuHeight = 400;
  const showAbove = position.y + menuHeight > window.innerHeight;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 340),
    ...(showAbove
      ? { bottom: window.innerHeight - position.y + 8 }
      : { top: position.y + 8 }),
    zIndex: 9999,
  };

  if (filteredItems.length === 0) {
    return createPortal(
      <div ref={menuRef} style={style} className="bg-surface-primary border border-line rounded-xl shadow-xl w-80">
        <div className="px-4 py-6 text-center text-sm text-ink-muted">
          No results
        </div>
      </div>,
      document.body
    );
  }

  let flatIndex = 0;

  return createPortal(
    <div ref={menuRef} style={style} className="bg-surface-primary border border-line rounded-xl shadow-xl w-80 overflow-hidden">
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: `min(448px, 40vh)`, maskImage: 'linear-gradient(black 0%, black calc(100% - 34px), transparent 100%)' }}
      >
        {(['basic', 'media', 'database'] as const).map(sectionKey => {
          const items = sections[sectionKey];
          if (!items || items.length === 0) return null;
          return (
            <div key={sectionKey} className="py-1 px-1">
              <div className="px-2 pt-2 pb-1.5 text-xs font-medium text-ink-secondary select-none">
                {SECTION_LABELS[sectionKey]}
              </div>
              {items.map(item => {
                const idx = flatIndex++;
                return (
                  <button
                    key={item.type}
                    type="button"
                    data-slash-index={idx}
                    className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left transition-colors ${
                      idx === selectedIndex
                        ? 'bg-surface-tertiary'
                        : 'hover:bg-hover-surface'
                    }`}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => onSelect(item.type)}
                  >
                    <div className="w-5 h-5 text-ink-body-light shrink-0 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="text-sm text-ink-strong flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-ink-muted font-mono">{item.shortcut} </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-line px-1 py-1">
        <button
          type="button"
          onClick={onClose}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-hover-surface transition-colors"
        >
          <span className="text-sm text-ink-body-light">Close menu</span>
          <span className="text-xs text-ink-muted">esc</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
