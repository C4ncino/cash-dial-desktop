import EmptyState from "@/components/General/EmptyState";
import { useAccounts } from "@/hooks/useStores";
import AccountCard from "./AccountCard";

export default function AccountsList() {
  const accounts = useAccounts((state) => state.accounts);
  if (!accounts.length) return <EmptyState title="Aún no tienes cuentas." description="Añade una cuenta para comenzar a registrar tus movimientos." />;
  return <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">{accounts.map((account) => <li key={account.id} className="min-w-0"><AccountCard {...account} /></li>)}</ul>;
}
