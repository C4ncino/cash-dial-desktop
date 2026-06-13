import { formatAmount } from "@/lib/formatters";

interface Props {
  amount: number;
  currency: Currency;
  className?: string;
}

const MoneyText = ({ amount, currency, className }: Props) => {
  return <strong className={className}>{formatAmount(amount, currency)}</strong>;
};

export default MoneyText;
