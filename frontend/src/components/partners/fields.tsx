"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function Field({
  name,
  label,
  value,
  type = "text",
  required = false,
  max = 250,
  placeholder,
}: {
  name: string;
  label: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
  max?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={max}
        defaultValue={value ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}
export function CountryField({
  countries,
  value = "KH",
  name = "country_code",
  label = "Country",
}: {
  countries: Record<string, string>;
  value?: string;
  name?: string;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label} *</Label>
      <select
        className="select-input"
        id={name}
        name={name}
        defaultValue={value}
        required
      >
        {Object.entries(countries).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function NotesField({
  value,
  max = 5000,
  label = "Operational notes",
}: {
  value?: string | null;
  max?: number;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="notes">{label}</Label>
      <textarea
        id="notes"
        name="notes"
        defaultValue={value ?? ""}
        maxLength={max}
        rows={4}
        className="select-input resize-y"
        placeholder="Instructions and useful context for your team"
      />
    </div>
  );
}
export function PartnerStatus({ archived }: { archived: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${archived ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-primary"}`}
    >
      <span
        className={`size-1.5 rounded-full ${archived ? "bg-amber-500" : "bg-primary"}`}
      />
      {archived ? "Archived" : "Active"}
    </span>
  );
}
