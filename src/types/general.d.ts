type BasicType = {
  id: number;
  name: string;
};

type Currency = BasicType & {
  symbol: string;
  code: string;
  conversionRate: number;
  conversionRateDate?: string | null;
};

type CurrencyStore = {
  currencies: Currency[];
  refreshRates: () => Promise<void>;
};

type Actions<T> = {
  populate: () => Promise<void>;
  add: (data: T) => Promise<T | void>;
  update: (id: number, data: T) => Promise<void>;
  remove: (id: number) => Promise<void>;
  getById: (id: number) => T | undefined;
};

type EditStore = {
  id: number | null;
  type: EDIT_TYPES | null;
  setId: (id: number | null, type: EDIT_TYPES | null) => void;
  clear: () => void;
};
