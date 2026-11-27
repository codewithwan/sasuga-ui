import { useState } from 'react'
import type { CSSProperties } from 'react'
import { InventoryGrid, ItemSlot } from '@/components/ui/item-slot'
import type { InventoryItem } from '@/components/ui/item-slot'
import { Icon } from '@/components/ui/icon'
import type { IconName } from '@/components/ui/icon'
import type { DocEntry } from '../types'

/* Item art from the kit's icon set; --icon-fill tints each sticker. */
const art = (name: IconName, fill = 'var(--color-accent-soft)') => <Icon name={name} style={{ '--icon-fill': fill } as CSSProperties} />

const BAG: (InventoryItem | null)[] = [
  { id: 'sword', name: 'Starlit Blade', icon: art('sword', 'var(--color-paper)'), rarity: 'legendary', kind: 'Weapon', description: 'Hums before every hit.', stats: [{ label: 'ATK', value: '+48' }, { label: 'Crit', value: '12%' }] },
  { id: 'shield', name: 'Cel Buckler', icon: art('shield', 'var(--color-accent)'), rarity: 'epic', kind: 'Shield', stats: [{ label: 'DEF', value: '+30' }] },
  { id: 'potion', name: 'Pop Tonic', icon: art('potion', 'var(--color-pop)'), rarity: 'common', quantity: 12, kind: 'Consumable', description: 'Restores 50 HP.' },
  { id: 'gem', name: 'Prism Shard', icon: art('gem'), rarity: 'rare', quantity: 3, kind: 'Material' },
  { id: 'key', name: 'Key of Echoes', icon: art('key', 'var(--color-pop)'), rarity: 'epic', kind: 'Accessory', stats: [{ label: 'SPD', value: '+6' }] },
  { id: 'coin', name: 'Star Coin', icon: art('coin', 'var(--color-accent-soft)'), quantity: 340, kind: 'Currency' },
  { id: 'scroll', name: 'Wind Scroll', icon: art('scroll', 'var(--color-paper)'), quantity: 27, kind: 'Consumable', description: 'Light as a sketch line.' },
  { id: 'bomb', name: 'Pop Bomb', icon: art('bomb', 'var(--color-accent)'), quantity: 5, kind: 'Throwable', description: 'Goes off with a very loud ドカン.' },
  null,
]

function InventoryDemo() {
  const [equipped, setEquipped] = useState<string[]>(['shield'])
  const names = BAG.filter((i): i is InventoryItem => !!i && equipped.includes(i.id)).map((i) => i.name)
  return (
    <div className="grid justify-items-center gap-4">
      <InventoryGrid label="Bag" items={BAG} columns={3} defaultSelected={0} equipped={equipped} onEquippedChange={(ids) => setEquipped(ids)} />
      <p className="m-0 text-center text-xs text-mute">
        Equipped: <span className="font-bold text-ink">{names.join(', ') || 'nothing'}</span>
      </p>
    </div>
  )
}

export default {
  slug: 'item-slot',
  name: 'Item Slot',
  jp: 'アイテム',
  category: 'Game',
  description:
    'Inventory slots and a keyboard grid. The border takes the rarity colour, hovering lifts a slot and opens an info card, selecting slams a cursor frame around it, and equipping cuts a slash through it with EQUIP! lettering. Empty slots are a dashed socket.',
  preview: <InventoryDemo />,
  usage: `import { InventoryGrid } from '@/components/ui/item-slot'

<InventoryGrid
  label="Bag"
  columns={3}
  items={[
    { id: 'sword', name: 'Starlit Blade', icon: <Icon name="sword" />, rarity: 'legendary' },
    { id: 'potion', name: 'Pop Tonic', icon: <Icon name="potion" />, quantity: 12 },
    null, // empty slot
  ]}
  equipped={equipped}
  onEquippedChange={(ids) => setEquipped(ids)}
/>`,
  examples: [
    {
      title: 'Single slots',
      preview: (
        <div className="flex flex-wrap items-center justify-center gap-5 pt-2">
          <ItemSlot aria-label="Empty slot" />
          <ItemSlot item={BAG[3]} />
          <ItemSlot item={BAG[4]} selected />
          <ItemSlot item={BAG[0]} equipped />
        </div>
      ),
      code: `<ItemSlot />                        {/* empty */}
<ItemSlot item={gem} />
<ItemSlot item={key} selected />
<ItemSlot item={sword} equipped />`,
    },
    {
      title: 'Uncontrolled grid',
      preview: <InventoryGrid label="Stash" items={[BAG[2], BAG[6], null, BAG[3], null, null]} columns={3} sfx="ゲット!" />,
      code: `<InventoryGrid label="Stash" items={stash} columns={3} sfx="ゲット!" />`,
    },
  ],
  props: [
    { name: 'items', type: '(InventoryItem | null)[]', description: 'InventoryGrid. One entry per slot; null = empty.' },
    { name: 'label', type: 'string', description: 'InventoryGrid. Accessible name of the grid.' },
    { name: 'columns', type: 'number', default: '5', description: 'InventoryGrid. Slots per row.' },
    { name: 'selected / defaultSelected', type: 'number | null', description: 'InventoryGrid. Selected slot index, controlled or not.' },
    { name: 'onSelectedChange', type: '(index, item) => void', description: 'InventoryGrid. Click / Enter on an unselected slot.' },
    { name: 'equipped / defaultEquipped', type: 'string[]', description: 'InventoryGrid. Equipped item ids, controlled or not.' },
    { name: 'onEquippedChange', type: '(ids, item) => void', description: 'InventoryGrid. Click / Enter on the selected slot toggles its item.' },
    { name: 'item', type: 'InventoryItem | null', description: 'ItemSlot. { id, name, icon, rarity?, quantity?, kind?, description?, stats? }.' },
    { name: 'selected, equipped', type: 'boolean', description: 'ItemSlot. Turning them on plays the cursor pop / the equip slash.' },
    { name: 'onSelect, onEquip', type: '() => void', description: 'ItemSlot. Activation when not selected / when selected.' },
    { name: 'infoPlacement, infoAlign', type: "'top' | 'bottom', 'start' | 'center' | 'end'", default: "'top', 'center'", description: 'ItemSlot. Where the hover info card opens (the grid picks these for you).' },
    { name: 'sfx', type: 'string | false', default: "'EQUIP!'", description: 'Lettering on equip (both components).' },
  ],
} satisfies DocEntry
