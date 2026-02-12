type addStyleProps = {
  htmlString: string;
  style: string;
} & (
  | {
      value: string;
    }
  | {
      value: (i: number, itemsNumber: number) => string;
      itemsNumber: number;
    }
);
