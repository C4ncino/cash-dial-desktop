import { selectAccountById, useAccounts } from "@/hooks/useStores";
import EntityLabel from "./EntityLabel";

interface Props { id: number; }

export default function AccountName({ id }: Props) {
  const account = useAccounts(selectAccountById(id));
  return <EntityLabel label={account?.name} icon={account?.type?.icon ?? "wallet"} />;
}
