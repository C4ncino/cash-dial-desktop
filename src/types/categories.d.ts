type Category = {
  id: number;
  fatherId: number | null;
  name: string;
  icon: string;
  color: string;
};

type CategoryNode = {
  id: number;
  name: string;
  children: CategoryNode[];
};
