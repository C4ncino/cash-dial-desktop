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
    <fieldset
      className="flex border border-gray-webui rounded"
      key={value === null ? "true" : "false"}
    >
      {items.map(({ name, id, icon }) => (
        <label
          className="first:rounded-l last:rounded-r border-r last:border-0 border-gray-webui select-none cursor-pointer flex items-center justify-center gap-2 py-2 w-full has-checked:bg-blue-600"
          htmlFor={`${name}-${modalId}`}
          key={id}
        >
          {icon && <Icon icon={`iconoir:${icon}`} className="text-white" />}
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
