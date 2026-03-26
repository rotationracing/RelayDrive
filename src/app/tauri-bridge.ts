// Bridge for Tauri backend commands
import { Channel, invoke } from '@tauri-apps/api/core'

export async function ensureDataDir() {
  return invoke('ensure_data_dir')
}

// New: user.json helpers
export interface UserData {
  account: boolean; // false = local; true = uses account
  name: string;
  user_id?: string | null;
  fullName?: string | null;
  username?: string | null;
  role?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  locked?: boolean | null;
}

export async function userExists() {
  return invoke<boolean>('user_exists')
}

export async function createUser(
  account: boolean,
  name: string,
  userId?: string | null,
  fullName?: string | null,
  username?: string | null,
  role?: string | null,
  email?: string | null,
  imageUrl?: string | null,
  locked?: boolean | null,
) {
  // Tauri v2 maps Rust snake_case to camelCase on the JS side
  return invoke('create_user', {
    account,
    name,
    userId: userId ?? null,
    fullName: fullName ?? null,
    username: username ?? null,
    role: role ?? null,
    email: email ?? null,
    imageUrl: imageUrl ?? null,
    locked: locked ?? null,
  })
}

export async function getUser() {
  return invoke<UserData | null>('get_user')
}

// Auth (JWT) storage
export interface AuthData {
  token: string;
  expiresAt: string;
  saved_at_ms: number;
}

export async function saveAuth(token: string, expiresAt: string) {
  return invoke('save_auth', { token, expiresAt })
}

export async function getAuth() {
  return invoke<AuthData | null>('get_auth')
}

export async function clearAuth() {
  return invoke('clear_auth')
}

export function isAuthExpired(saved_at_ms: number, nowMs = Date.now()) {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return nowMs - saved_at_ms >= sevenDaysMs;
}

// Open URL via Windows cmd start (guaranteed default browser)
export async function openUrlCmd(url: string) {
  return invoke('open_url_cmd', { url })
}

// Backend HTTP helpers (via Tauri)
export interface TokenExchangeRes { token: string; expiresAt: string }
export async function exchangeToken(token: string) {
  return invoke<TokenExchangeRes>('exchange_token', { token })
}

export interface MeResponse {
  id: string;
  username: string;
  fullName?: string;
  role?: string;
  email?: string;
  createdAt?: string;
  invalidAt?: string;
  imageUrl?: string;
  locked?: boolean;
}

export async function fetchMe(bearerToken: string) {
  // Tauri v2 maps Rust snake_case params to camelCase on the JS side
  // Rust: fetch_me(bearer_token: String) -> JS: { bearerToken }
  return invoke<MeResponse>('fetch_me', { bearerToken })
}

// Startup control: show main window and close splash
export async function finishStartup() {
  return invoke('finish_startup')
}

// Updater bridge (desktop)
export interface UpdateMetadata {
  version: string
  currentVersion: string
}

export type DownloadEvent =
  | { event: 'Started'; data: { contentLength?: number } }
  | { event: 'Progress'; data: { chunkLength: number } }
  | { event: 'Finished' }

export async function fetchUpdate() {
  return invoke<UpdateMetadata | null>('fetch_update')
}

export async function installUpdate(onEvent: (ev: DownloadEvent) => void) {
  const channel = new Channel<DownloadEvent>()
  channel.onmessage = onEvent
  return invoke('install_update', { onEvent: channel })
}

// Settings bridge
// Compact choice schema saved in settings.json
export interface MeasurementUnitsChoice {
  distance: "metric" | "imperial"
  speed: "metric" | "imperial"
  acceleration: "metric" | "imperial"
  temperature: "celsius" | "fahrenheit"
  pressure: "bar" | "psi"
  torque: "nm" | "lb-ft"
  power: "hp" | "kw"
  fuel_volume: "metric" | "imperial"
  suspension_travel: "mm" | "in"
  tire_pressure: "bar" | "psi"
  fuel_consumption: "metric" | "imperial"
}

export interface ConnectionDetails {
  host: string
  port: number
  connectionPassword: string
  commandPassword: string
}

export interface GameConnectionSettings {
  acc: ConnectionDetails
  iracing: ConnectionDetails
  lmu: ConnectionDetails
}

export interface SettingsData {
  // Tauri v2 maps Rust snake_case => camelCase on JS bridge
  checkForUpdates: boolean
  language: string
  measurement_units: MeasurementUnitsChoice
  hotkeys?: Record<string, string | null>
  connectionSettings: GameConnectionSettings
  dataShareConsent?: boolean
  proSubscriptionPlan?: "pro" | "free" | null
}

export async function getSettings() {
  return invoke<SettingsData>('get_settings')
}

export async function saveSettings(settings: SettingsData) {
  return invoke('save_settings', { settings })
}

// Settings import helpers (compact schema)
export async function importSettings(filePath: string) {
  return invoke('import_settings', { filePath })
}

export async function importSettingsJson(contents: string) {
  return invoke('import_settings_json', { contents })
}

// Legacy profile/settings functions (kept if used elsewhere)
export async function profileExists() {
  return invoke<boolean>('profile_exists')
}

export async function settingsExists() {
  return invoke<boolean>('settings_exists')
}

export interface ProfileData {
  name: string;
  image?: string | null;
  account_type: string;
}

export async function getProfile() {
  return invoke('get_profile')
}

export async function saveProfile(profile: Omit<ProfileData, 'account_type'> & { account_type?: string }) {
  // Ensure account_type is always set, default to 'free' if not provided
  const profileData: ProfileData = {
    ...profile,
    account_type: profile.account_type || 'free',
  };
  return invoke('save_profile', { profile: profileData })
}


export async function saveProfileImage(filename: string, bytes: Uint8Array) {
  return invoke('save_profile_image', { filename, bytes: Array.from(bytes) })
}

export async function deleteProfile() {
  return invoke('delete_profile')
}

export async function registerDevice() {
  return invoke('register_device')
}

export async function pollForLink(device_uuid: string) {
  return invoke('poll_for_link', { device_uuid })
}

export async function linkDevice() {
  return invoke('link_device')
}

// Active game helpers
export async function setActiveGame(game: string) {
  return invoke('set_active_game', { game })
}

export async function getActiveGame() {
  return invoke<string | null>('get_active_game')
}

export async function isGameProcessRunning(gameId?: string) {
  return invoke<boolean>('is_game_process_running', {
    gameId: gameId ?? null,
  })
}

export async function launchGame(gameId?: string) {
  return invoke('launch_game', {
    game: gameId ?? null,
  })
}

// Overlay window helpers
export interface OverlayWindowOptions {
  id: string
  url: string
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  alwaysOnTop?: boolean
  skipTaskbar?: boolean
  transparent?: boolean
  decorations?: boolean
}

export interface OverlayWindowUpdate {
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  alwaysOnTop?: boolean
  visible?: boolean
}

export async function createOverlayWindow(options: OverlayWindowOptions) {
  return invoke('create_overlay_window', { options })
}

export async function updateOverlayWindowState(id: string, updates: OverlayWindowUpdate) {
  return invoke('update_overlay_window', { id, updates })
}

export async function closeOverlayWindow(id: string) {
  return invoke('close_overlay_window', { id })
}

// Overlay config file operations
export interface OverlayPosition {
  x: number
  y: number
}

export interface OverlayConfigItem {
  enabled: boolean
  position?: OverlayPosition
  size?: number
  opacity?: number
  componentSettings?: Record<string, number | string | boolean | [number, number, number, number]>
}

export interface OverlayConfig {
  overlaysEnabled?: boolean
  overlays: Record<string, OverlayConfigItem>
}

export async function loadOverlayConfig(name?: string) {
  return invoke<OverlayConfig>('load_overlay_config', { name: name ?? null })
}

export async function saveOverlayConfig(name: string, config: OverlayConfig) {
  return invoke('save_overlay_config', { name, config })
}

export async function listOverlayConfigs() {
  return invoke<string[]>('list_overlay_configs')
}

export async function deleteOverlayConfig(name: string) {
  return invoke('delete_overlay_config', { name })
}

// Global shortcuts bridge
export async function registerGlobalShortcut(shortcut: string) {
  return invoke('register_global_shortcut', { shortcut })
}

export async function unregisterGlobalShortcut(shortcut: string) {
  return invoke('unregister_global_shortcut', { shortcut })
}

export async function unregisterAllGlobalShortcuts() {
  return invoke('unregister_all_global_shortcuts')
}