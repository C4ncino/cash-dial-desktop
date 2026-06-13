const AccountMovements = () => {
  const _id =
    typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("id"))
      : null;

  return <section></section>;
};

export default AccountMovements;
