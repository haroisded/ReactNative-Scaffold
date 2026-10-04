import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { PixelRatio } from 'react-native';
import type { ColorValue } from 'react-native';

/**
 * The app's icon vocabulary: one name per meaning, each with its SF Symbol and its Material Symbol
 * (instruction_mds/frontend.md §6). Every pair was checked against `sf-symbols-typescript` and
 * `expo-symbols/build/android/symbols.json` on 2026-09-17 — and the types check them again, because an
 * Android name that is not in the font draws a blank with no warning (`androidSymbolToString`).
 *
 * Paper props take plain strings, so pass these names to `icon=` / `source=`. A name missing here
 * falls back to MaterialCommunityIcons in `renderIcon` below: that is where Paper's own internal names
 * (`menu-down`, `check`) and the two brand logos (`google`, `facebook`) land, since neither symbol set
 * carries brand marks.
 */
export const ICONS = {
  // Actions
  add: { ios: 'plus', android: 'add' },
  archive: { ios: 'archivebox', android: 'archive' },
  check: { ios: 'checkmark', android: 'check' },
  close: { ios: 'xmark', android: 'close' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  delete: { ios: 'trash', android: 'delete' },
  edit: { ios: 'pencil', android: 'edit' },
  filter: { ios: 'slider.horizontal.3', android: 'tune' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  minus: { ios: 'minus', android: 'remove' },
  more: { ios: 'ellipsis', android: 'more_vert' },
  restore: { ios: 'arrow.uturn.backward', android: 'unarchive' },
  search: { ios: 'magnifyingglass', android: 'search' },

  // Direction
  'arrow-back': { ios: 'arrow.left', android: 'arrow_back' },
  'arrow-forward': { ios: 'arrow.right', android: 'arrow_forward' },
  'chevron-down': { ios: 'chevron.down', android: 'expand_more' },
  'chevron-left': { ios: 'chevron.left', android: 'chevron_left' },
  'chevron-right': { ios: 'chevron.right', android: 'chevron_right' },

  // Navigation and places
  account: { ios: 'person', android: 'person' },
  'account-circle': { ios: 'person.crop.circle', android: 'account_circle' },
  'bar-chart': { ios: 'chart.bar', android: 'bar_chart' },
  // Inventory's and Stock's category and variant group folders.
  folder: { ios: 'folder', android: 'folder' },
  bell: { ios: 'bell', android: 'notifications' },
  // SF Symbols has no calculator glyph; the Register key reads as arithmetic either way.
  calculator: { ios: 'plus.forwardslash.minus', android: 'calculate' },
  clipboard: { ios: 'list.clipboard', android: 'assignment' },
  grid: { ios: 'square.grid.2x2', android: 'grid_view' },
  home: { ios: 'house', android: 'home' },
  inventory: { ios: 'shippingbox', android: 'inventory_2' },
  // Resources and its three screens: the group, then rentals — a key reads as
  // "handed over and given back", which is what a rental and a booking share.
  layers: { ios: 'square.stack.3d.up', android: 'layers' },
  key: { ios: 'key', android: 'key' },
  list: { ios: 'list.bullet', android: 'list' },
  // Stock: deliveries in and suppliers.
  truck: { ios: 'truck.box', android: 'local_shipping' },
  menu: { ios: 'line.3.horizontal', android: 'menu' },
  percent: { ios: 'percent', android: 'percent' },
  // The Register's sales. SF Symbols' own `receipt` needs iOS 17; a plain document reads the same.
  receipt: { ios: 'doc.plaintext', android: 'receipt_long' },
  settings: { ios: 'gearshape', android: 'settings' },
  tag: { ios: 'tag', android: 'sell' },
  toggle: { ios: 'switch.2', android: 'toggle_on' },
  users: { ios: 'person.2', android: 'group' },

  // Fields and content
  calendar: { ios: 'calendar', android: 'calendar_today' },
  'calendar-month': { ios: 'calendar', android: 'calendar_month' },
  camera: { ios: 'camera', android: 'photo_camera' },
  clock: { ios: 'clock', android: 'schedule' },
  image: { ios: 'photo', android: 'image' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning' },

  // Profile
  'account-details': { ios: 'person.text.rectangle', android: 'badge' },
  device: { ios: 'iphone', android: 'smartphone' },
  // The Themes row and its toggle. A palette rather than a moon: the row is the way into every
  // appearance choice, and light/dark is only the first one it carries.
  themes: { ios: 'paintpalette', android: 'palette' },
  'theme-switch': { ios: 'arrow.triangle.2.circlepath', android: 'autorenew' },
  'person-remove': { ios: 'person.badge.minus', android: 'person_remove' },
  shield: { ios: 'person.badge.shield.checkmark', android: 'shield_person' },
  storefront: { ios: 'storefront', android: 'storefront' },
  // SF Symbols has no handshake; a document reads as "terms" on its own.
  terms: { ios: 'doc.text', android: 'description' },

  // Store categories (src/features/merchants/schema.ts)
  apparel: { ios: 'tshirt', android: 'apparel' },
  // SF Symbols has no bread glyph.
  bakery: { ios: 'birthday.cake', android: 'bakery_dining' },
  books: { ios: 'book', android: 'menu_book' },
  cafe: { ios: 'cup.and.saucer', android: 'local_cafe' },
  cart: { ios: 'cart', android: 'shopping_cart' },
  fitness: { ios: 'dumbbell', android: 'fitness_center' },
  laptop: { ios: 'laptopcomputer', android: 'laptop' },
  'more-horizontal': { ios: 'ellipsis', android: 'more_horiz' },
  pharmacy: { ios: 'pills', android: 'medication' },
  restaurant: { ios: 'fork.knife', android: 'restaurant' },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

// A type predicate rather than a cast, so a name that passes indexes ICONS as one of its keys.
// Object.hasOwn and not `in`: `in` also matches inherited keys like "toString".
function isIconName(name: string): name is IconName {
  return Object.hasOwn(ICONS, name);
}

/**
 * PaperProvider's `settings.icon` (src/app/_layout.tsx). Paper hands it a name, a colour and a size for
 * every `icon` / `source` prop, so passing `color` as `tintColor` is what keeps every icon on the
 * theme.
 *
 * Paper's `direction` is its own RTL flag, dropped here: SymbolView has no such prop.
 * `allowFontScaling` only reaches the fallback. On iOS SymbolView draws a fixed-size image. On Android it
 * draws the glyph as a Text in a size × size box (expo-symbols build/SymbolView.js:35-40), and that Text
 * follows the OS font scale, so at 200% the glyph is twice the box and clipped. The glyph is therefore
 * asked for at size ÷ font scale, which the scale brings back to size, and the box is held at size by
 * `style` (instruction_mds/frontend.md §7).
 */
export function renderIcon({
  name,
  color,
  size,
  allowFontScaling,
  testID,
}: {
  name: string;
  color?: ColorValue;
  size: number;
  allowFontScaling?: boolean;
  testID?: string;
}) {
  if (isIconName(name)) {
    const glyph = process.env.EXPO_OS === 'android' ? size / PixelRatio.getFontScale() : size;
    return <SymbolView name={ICONS[name]} tintColor={color} size={glyph} style={{ width: size, height: size }} testID={testID} />;
  }
  return (
    <MaterialCommunityIcons
      // SAFETY: the names reaching here are Paper's own MaterialCommunityIcons names and the two brand
      // logos, all in the glyph map. One that is not renders the set's "?" glyph — visible on the
      // device, never a crash — which is also why the fallback is this set and not a blank symbol.
      name={name as keyof typeof MaterialCommunityIcons.glyphMap}
      color={color}
      size={size}
      allowFontScaling={allowFontScaling}
      testID={testID}
    />
  );
}
