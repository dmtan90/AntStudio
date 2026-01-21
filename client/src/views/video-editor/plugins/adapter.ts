import type { EditorBrand, EditorProduct } from "video-editor/schema/adapter";

export type AdapterMode = "create" | "edit";

export interface AdapterProps {
  product?: EditorProduct;
  brand?: EditorBrand;
  objective?: string;
  mode?: AdapterMode;
}

export class Adapter {
  objective?: string;
  mode?: AdapterMode;
  brand?: EditorBrand;
  product?: EditorProduct;

  constructor() {
  
  }

  initialize(props: AdapterProps) {
    this.mode = props.mode;
    this.brand = props.brand;
    this.product = props.product;
    this.objective = props.objective;
  }

  update(props: Partial<AdapterProps>) {
    for (const _key in props) {
      const key = _key as keyof AdapterProps;
      (this as any)[key] = props[key];
    }
  }
}
