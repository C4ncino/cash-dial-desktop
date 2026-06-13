import { Icon } from "@iconify/react";
import { twMerge } from "tailwind-merge";

interface Props {
  backgroundColor: string;
  icon: string;
  className?: string;
}

const SquareIcon = ({ backgroundColor, icon, className }: Props) => {
  return (
    <div className={twMerge("p-1 rounded-md", className)} style={{ backgroundColor }}>
      <Icon icon={`iconoir:${icon}`} className="h-full w-full text-white" />
    </div>
  );
};

export default SquareIcon;
