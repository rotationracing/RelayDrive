"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/i18n"
import {
  type AccelChoice,
  type DistanceChoice,
  type FuelConsumptionChoice,
  type FuelVolumeChoice,
  type MeasurementUnitsChoice,
  type PowerChoice,
  type PressureChoice,
  type SpeedChoice,
  type SuspensionTravelChoice,
  type TemperatureChoice,
  type TirePressureChoice,
  type TorqueChoice,
} from "@/lib/units"
import { useEffect, useState } from "react"

export function MeasurementUnitsModal({
  open,
  onOpenChange,
  valueChoice,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  valueChoice: MeasurementUnitsChoice
  onSave: (choice: MeasurementUnitsChoice) => void
}) {
  const { t } = useI18n()
  const [localChoice, setLocalChoice] = useState<MeasurementUnitsChoice>(() => valueChoice)

  useEffect(() => {
    if (open) {
      setLocalChoice(valueChoice)
    }
  }, [open, valueChoice])

  const handleSave = () => {
    onSave(localChoice)
    onOpenChange(false)
  }

  const Field = ({
    label,
    children,
  }: {
    label: string
    children: React.ReactNode
  }) => (
    <div className="grid grid-cols-[minmax(0,1fr)_148px] items-center gap-4 border-b border-border py-3 last:border-b-0">
      <Label className="pr-3 text-sm text-muted-foreground">{label}</Label>
      <div className="w-[148px] justify-self-end">
        {children}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg gap-0 overflow-hidden rounded-[var(--radius-2xl)] border-border bg-card p-0 shadow-2xl">
        <DialogHeader>
          <div className="border-b border-border px-6 py-5">
            <DialogTitle>{t("common.measurement_units")}</DialogTitle>
            <DialogDescription className="mt-2">{t("common.choose_units")}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-0">
          <Field label={t("units.distance.label")}> 
            <Select value={localChoice.distance} onValueChange={(v: DistanceChoice) => setLocalChoice(s => ({ ...s, distance: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">{t("common.metric")} ({t("units.distance.metric_abbr")})</SelectItem>
                <SelectItem value="imperial">{t("common.imperial")} ({t("units.distance.imperial_abbr")})</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.speed.label")}>
            <Select value={localChoice.speed} onValueChange={(v: SpeedChoice) => setLocalChoice(s => ({ ...s, speed: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">{t("common.metric")} ({t("units.speed.metric_abbr")})</SelectItem>
                <SelectItem value="imperial">{t("common.imperial")} ({t("units.speed.imperial_abbr")})</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.acceleration.label")}>
            <Select value={localChoice.acceleration} onValueChange={(v: AccelChoice) => setLocalChoice(s => ({ ...s, acceleration: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">{t("common.metric")} ({t("units.acceleration.metric_abbr")})</SelectItem>
                <SelectItem value="imperial">{t("common.imperial")} ({t("units.acceleration.imperial_abbr")})</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.temperature.label")}>
            <Select value={localChoice.temperature} onValueChange={(v: TemperatureChoice) => setLocalChoice(s => ({ ...s, temperature: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="celsius">{t("units.temperature.celsius_name")}</SelectItem>
                <SelectItem value="fahrenheit">{t("units.temperature.fahrenheit_name")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.pressure.label")}>
            <Select value={localChoice.pressure} onValueChange={(v: PressureChoice) => setLocalChoice(s => ({ ...s, pressure: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">{t("units.pressure.bar_name")}</SelectItem>
                <SelectItem value="psi">{t("units.pressure.psi_name")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.torque.label")}>
            <Select value={localChoice.torque} onValueChange={(v: TorqueChoice) => setLocalChoice(s => ({ ...s, torque: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nm">{t("units.torque.nm_abbr")}</SelectItem>
                <SelectItem value="lb-ft">{t("units.torque.lbft_abbr")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.power.label")}>
            <Select value={localChoice.power} onValueChange={(v: PowerChoice) => setLocalChoice(s => ({ ...s, power: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hp">{t("units.power.hp_abbr")}</SelectItem>
                <SelectItem value="kw">{t("units.power.kw_abbr")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.fuel_volume.label")}>
            <Select value={localChoice.fuel_volume} onValueChange={(v: FuelVolumeChoice) => setLocalChoice(s => ({ ...s, fuel_volume: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">{t("common.metric")} ({t("units.fuel_volume.metric_abbr")})</SelectItem>
                <SelectItem value="imperial">{t("common.imperial")} ({t("units.fuel_volume.imperial_abbr")})</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.suspension_travel.label")}>
            <Select value={localChoice.suspension_travel} onValueChange={(v: SuspensionTravelChoice) => setLocalChoice(s => ({ ...s, suspension_travel: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">{t("units.suspension_travel.mm_abbr")}</SelectItem>
                <SelectItem value="in">{t("units.suspension_travel.in_abbr")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.tire_pressure.label")}>
            <Select value={localChoice.tire_pressure} onValueChange={(v: TirePressureChoice) => setLocalChoice(s => ({ ...s, tire_pressure: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">{t("units.tire_pressure.bar_abbr")}</SelectItem>
                <SelectItem value="psi">{t("units.tire_pressure.psi_abbr")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("units.fuel_consumption.label")}>
            <Select value={localChoice.fuel_consumption} onValueChange={(v: FuelConsumptionChoice) => setLocalChoice(s => ({ ...s, fuel_consumption: v }))}>
              <SelectTrigger className="h-11 w-full rounded-[var(--radius-lg)] border-border bg-input px-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">{t("common.metric")} ({t("units.fuel_consumption.metric_abbr")})</SelectItem>
                <SelectItem value="imperial">{t("common.imperial")} ({t("units.fuel_consumption.imperial_abbr")})</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" className="rounded-[var(--radius-lg)]" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} className="rounded-[var(--radius-lg)]">{t("common.save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
