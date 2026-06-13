type BasicType = {
  id: number;
  name: string;
};

type Currency = BasicType & {
  symbol: string;
  code: string;
};

type CurrencyStore = {
  currencies: Currency[];
};

type Actions<T> = {
  populate: () => Promise<void>;
  add: (data: T) => void;
  update: (id: number, data: T) => void;
  remove: (id: number) => void;
  getById: (id: number) => T | undefined;
};

type EditStore = {
  id: number | null;
  type: EDIT_TYPES | null;
  setId: (id: number | null, type: EDIT_TYPES | null) => void;
  clear: () => void;
};
