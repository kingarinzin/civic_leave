"use client";

import React from 'react';
import { Badge } from '@radix-ui/themes';

interface AbbrBadgeProps {
  /** Full name, e.g. "Department of Professional Support" */
  name: string;
  /** Short display, e.g. "DoPS" */
  abbr: string;
  /** Radix theme colour */
  color?: 'blue' | 'green' | 'purple' | 'gray' | 'orange' | 'red' | 'amber' | 'cyan' | 'iris' | 'jade' | 'lime' | 'mint' | 'pink' | 'plum' | 'ruby' | 'sky' | 'teal' | 'tomato' | 'violet' | 'yellow';
  /** Radix badge size */
  size?: '1' | '2' | '3';
  /** Optional inline style (used for the purple stakeholder chips) */
  style?: React.CSSProperties;
  /** Optional trailing content, e.g. a remove "✕" button */
  children?: React.ReactNode;
}

/**
 * Renders a Badge showing the abbreviation, with a native tooltip
 * containing the full name. Hover shows "Department of Professional Support".
 */
export default function AbbrBadge({
  name,
  abbr,
  color = 'blue',
  size = '1',
  style,
  children,
}: AbbrBadgeProps): React.ReactElement {
  return (
    <Badge
      variant="soft"
      color={color}
      size={size}
      title={name}
      style={style}
      className={children ? 'flex items-center gap-1' : undefined}
    >
      {abbr}
      {children}
    </Badge>
  );
}