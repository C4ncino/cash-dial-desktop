type Category = {
  id: number;
  fatherId: number | null;
  name: string;
  icon: string;
  color: string;
};

type CategoryStore = {
  categories: Category[];
};

type CategoryNode = {
  id: number;
  name: string;
  icon: string;
  color: string;
  children: CategoryNode[];
};
