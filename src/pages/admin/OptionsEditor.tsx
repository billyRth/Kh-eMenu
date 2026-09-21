import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useT, type StringKey } from '@/lib/i18n';
import type { OptionChoice, OptionGroup } from '@/lib/types';

const uid = () => crypto.randomUUID().slice(0, 8);

type Extra = 'km' | 'zh';

const choice = (name: string, price = 0, km = '', zh = ''): OptionChoice => ({ id: uid(), name, price, i18n: { km, zh } });

/** Ready-made groups restaurants use most, so setting up a café menu takes seconds. */
const PRESETS: { label: StringKey; make: () => OptionGroup }[] = [
  {
    label: 's_presetSugar',
    make: () => ({
      id: uid(), name: 'Sugar level', required: true, multi: false, i18n: { km: 'កម្រិតស្ករ', zh: '甜度' },
      choices: [choice('Normal sugar', 0, 'ស្ករធម្មតា', '正常糖'), choice('Less sugar (50%)', 0, 'ស្ករតិច (50%)', '半糖'), choice('No sugar', 0, 'គ្មានស្ករ', '无糖')],
    }),
  },
  {
    label: 's_presetIce',
    make: () => ({
      id: uid(), name: 'Ice', required: true, multi: false, i18n: { km: 'ទឹកកក', zh: '冰量' },
      choices: [choice('Normal ice', 0, 'ទឹកកកធម្មតា', '正常冰'), choice('Less ice', 0, 'ទឹកកកតិច', '少冰'), choice('No ice', 0, 'គ្មានទឹកកក', '去冰')],
    }),
  },
  {
    label: 's_presetSize',
    make: () => ({
      id: uid(), name: 'Size', required: true, multi: false, i18n: { km: 'ទំហំ', zh: '份量' },
      choices: [choice('Regular', 0, 'ធម្មតា', '常规'), choice('Large', 0.5, 'ធំ', '大份')],
    }),
  },
  {
    label: 's_presetSpice',
    make: () => ({
      id: uid(), name: 'Spice level', required: true, multi: false, i18n: { km: 'កម្រិតហឹរ', zh: '辣度' },
      choices: [choice('Not spicy', 0, 'មិនហឹរ', '不辣'), choice('Medium', 0, 'ហឹរមធ្យម', '中辣'), choice('Extra spicy', 0, 'ហឹរខ្លាំង', '特辣')],
    }),
  },
  {
    label: 's_presetAddons',
    make: () => ({ id: uid(), name: 'Add-ons', required: false, multi: true, i18n: { km: 'បន្ថែម', zh: '加料' }, choices: [choice('Extra egg', 0.5, 'ពងមាន់បន្ថែម', '加蛋')] }),
  },
];

export function OptionsEditor({ value, onChange, languages }: { value: OptionGroup[]; onChange: (v: OptionGroup[]) => void; languages: Extra[] }) {
  const { t } = useT();
  const updateGroup = (i: number, patch: Partial<OptionGroup>) => onChange(value.map((g, gi) => (gi === i ? { ...g, ...patch } : g)));
  const updateChoice = (gi: number, ci: number, patch: Partial<OptionChoice>) =>
    updateGroup(gi, { choices: value[gi].choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm font-medium">{t('s_options')}</span>
        {PRESETS.map((p) => (
          <Button key={p.label} type="button" size="xs" variant="outline" onClick={() => onChange([...value, p.make()])}>
            <Plus /> {t(p.label)}
          </Button>
        ))}
        <Button type="button" size="xs" variant="ghost" onClick={() => onChange([...value, { id: uid(), name: '', required: false, multi: false, choices: [choice('')] }])}>
          <Plus /> {t('s_custom')}
        </Button>
      </div>
      {value.length === 0 && <p className="text-xs text-muted-foreground">{t('s_noOptions')}</p>}

      {value.map((g, gi) => (
        <div key={g.id} className="space-y-2.5 rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <Input value={g.name} placeholder={t('s_groupPlaceholder')} onChange={(e) => updateGroup(gi, { name: e.target.value })} className="h-9 font-semibold" />
            <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" title={t('s_removeGroup')} onClick={() => onChange(value.filter((_, i) => i !== gi))}>
              <Trash2 />
            </Button>
          </div>
          {languages.length > 0 && (
            <div className="flex gap-2">
              {languages.map((l) => (
                <Input
                  key={l}
                  value={g.i18n?.[l] ?? ''}
                  placeholder={l === 'km' ? 'ខ្មែរ' : '中文'}
                  onChange={(e) => updateGroup(gi, { i18n: { ...g.i18n, [l]: e.target.value } })}
                  className="h-8 text-sm"
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs font-medium">
            <label className="flex items-center gap-2">
              <Switch size="sm" checked={g.required} onCheckedChange={(v) => updateGroup(gi, { required: v })} /> {t('s_mustChoose')}
            </label>
            <label className="flex items-center gap-2">
              <Switch size="sm" checked={g.multi} onCheckedChange={(v) => updateGroup(gi, { multi: v })} /> {t('s_canPickSeveral')}
            </label>
          </div>
          <div className="space-y-1.5">
            {g.choices.map((c, ci) => (
              <div key={c.id} className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
                <Input value={c.name} placeholder={t('s_choicePlaceholder')} onChange={(e) => updateChoice(gi, ci, { name: e.target.value })} className="h-8 min-w-32 flex-1 text-sm" />
                {languages.map((l) => (
                  <Input
                    key={l}
                    value={c.i18n?.[l] ?? ''}
                    placeholder={l === 'km' ? 'ខ្មែរ' : '中文'}
                    onChange={(e) => updateChoice(gi, ci, { i18n: { ...c.i18n, [l]: e.target.value } })}
                    className="h-8 w-24 text-sm"
                  />
                ))}
                <div className="relative w-24">
                  <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">+$</span>
                  <Input
                    inputMode="decimal"
                    value={c.price ? String(c.price) : ''}
                    placeholder="0.00"
                    onChange={(e) => updateChoice(gi, ci, { price: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-8 pl-7 text-sm"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon-xs" title={t('s_removeChoice')} onClick={() => updateGroup(gi, { choices: g.choices.filter((_, i) => i !== ci) })}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" size="xs" variant="ghost" onClick={() => updateGroup(gi, { choices: [...g.choices, choice('')] })}>
              <Plus /> {t('s_addChoice')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Drop empty rows and round prices before saving. */
export function cleanOptions(groups: OptionGroup[]): OptionGroup[] {
  return groups
    .map((g) => ({
      ...g,
      name: g.name.trim(),
      choices: g.choices.filter((c) => c.name.trim()).map((c) => ({ ...c, name: c.name.trim(), price: Math.round(Number(c.price) * 100) / 100 })),
    }))
    .filter((g) => g.name && g.choices.length > 0);
}
