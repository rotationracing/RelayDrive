import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export interface OverlayConfig {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** default enabled state when overlays are first loaded */
  defaultEnabled?: boolean;
  /** default logical position in pixels from top-left corner */
  defaultPosition?: { x: number; y: number };
  /** default relative size percentage */
  defaultSize?: number;
  /** default opacity percentage */
  defaultOpacity?: number;
  /** base window size in logical pixels before scaling */
  baseDimensions?: { width: number; height: number };
}

export type SettingType = "slider" | "switch" | "select" | "input" | "color";

export interface ComponentSetting {
  id: string;
  label: string;
  description?: string;
  type: SettingType;
  /** For slider type */
  min?: number;
  max?: number;
  step?: number;
  /** For select type - array of {label: string, value: string} */
  options?: Array<{ label: string; value: string }>;
  /** Default value */
  defaultValue: number | string | boolean | [number, number, number, number]; // For color: [r, g, b, alpha] where alpha is 0-1
  /** Unit to display (e.g., "px", "%", "rem") */
  unit?: string;
  /** Category to group settings under */
  category?: string;
}

export interface ComponentSettingsSchema {
  [key: string]: ComponentSetting;
}

export interface OverlayRenderProps {
  size: number;
  opacity: number;
  moveMode: boolean;
  /** Component-specific settings */
  componentSettings?: Record<string, number | string | boolean | [number, number, number, number]>;
}

export interface OverlayModule extends OverlayConfig {
  Component: ComponentType<OverlayRenderProps>;
  /** Component-specific settings schema */
  componentSettings?: ComponentSettingsSchema;
}

export interface OverlayInstance extends OverlayConfig {
  enabled: boolean;
  position: { x: number; y: number };
  size: number;
  opacity: number;
  /** Component-specific settings */
  componentSettings?: Record<string, number | string | boolean | [number, number, number, number]>;
}
