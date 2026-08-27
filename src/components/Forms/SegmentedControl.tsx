import { Icon } from "@iconify/react";

type Item = {
  id: number;
  name: string;
  icon?: string;
};

interface Props {
  items: Item[];
  value: number | null;
  modalId?: string;
  onChange: (value: number | null) => void;
}

const SegmentedControl = ({ items, value, modalId, onChange }: Props) => {
  return (
    <fieldset className="glass-control flex rounded">
      {items.map(({ name, id, icon }) => (
        <label
          className="flex w-full cursor-pointer select-none items-center justify-center gap-2 border-r border-zinc-300 py-2 first:rounded-l last:rounded-r last:border-0 has-checked:bg-blue-600 has-checked:text-zinc-50 dark:border-zinc-700 dark:has-checked:bg-blue-400 dark:has-checked:text-zinc-950"
          htmlFor={`${name}-${modalId}`}
          key={id}
        >
          {icon && <Icon icon={`iconoir:${icon}`} />}
          {name}
          <input
            className="hidden"
            type="radio"
            name="type"
            id={`${name}-${modalId}`}
            value={id}
            defaultChecked={id === value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </label>
      ))}
    </fieldset>
  );
};

export default SegmentedControl;
