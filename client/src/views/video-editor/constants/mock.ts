import { reactive } from "vue";
import { defineStore } from "pinia"

// import { createInstance } from "video-editor/lib/utils";
import type { EditorBrand, EditorProduct } from "video-editor/schema/adapter";
import type { EditorAudio, EditorMedia, EditorTemplate } from "video-editor/types/editor";
import type { PromptSession } from "video-editor/types/prompt";

// const images: EditorMedia[] = ref([]);
// const videos: EditorMedia[] = [];
// const audios: EditorAudio[] = [];

// const prompts: PromptSession[] = [];
// const templates: EditorTemplate[] = [];
// const subscribers: Function[] = [];

export interface MockDataState {
  images: EditorMedia[];
  videos: EditorMedia[];
  audios: EditorAudio[];
  prompts: PromptSession[];
  templates: EditorTemplate[];
  subscribers: Function[];
}

// export class MockDataStore {
//   state: MockDataState;
//   subscribers: Set<Function>;

//   constructor() {
//     this.subscribers = createInstance(Set<Function>);
//     this.state = { images, videos, audios, templates, prompts };
//   }

//   store() {
//     return this.state;
//   }

//   subscribe(callback: Function) {
//     this.subscribers.add(callback);
//     return () => this.subscribers.delete(callback);
//   }

//   upload(type: "audio", props: EditorAudio): void;
//   upload(type: "template", props: EditorTemplate): void;
//   upload(type: "image" | "video", props: EditorMedia): void;
//   upload(type: "image" | "video" | "audio" | "template", props: EditorAudio | EditorMedia | EditorTemplate) {
//     switch (type) {
//       case "image":
//         this.state.images.push(props as EditorMedia);
//         break;
//       case "video":
//         this.state.videos.push(props as EditorMedia);
//         break;
//       case "audio":
//         this.state.audios.push(props as EditorAudio);
//         break;
//       case "template": {
//         const data = props as EditorTemplate;
//         const index = this.state.templates.findIndex((template) => template.id === data.id);
//         if (index === -1) this.state.templates.push(data);
//         else this.state.templates[index] = data;
//         break;
//       }
//     }
//     this.subscribers.forEach((listener) => listener());
//   }
// }

// export const mock = createInstance(MockDataStore);

// export function useMockStore() {
//   const store = toRefs(mock.store());
//   const unsubscribe = mock.subscribe(() => {
//     Object.assign(store, mock.store());
//   });
//   watch(store, () => unsubscribe);  
//   return store;
// }

export const useMockStore = defineStore('mock', {
  state: () => ({
    images: reactive([]), 
    videos: reactive([]), 
    audios: reactive([]), 
    templates: reactive([]), 
    prompts: reactive([]),
    subscribers: reactive([])
  }),

  getters: {
    store(): any {
      return this.$state;
    }
  },

  actions: {
    upload(type: "image" | "video" | "audio" | "template", props: EditorAudio | EditorMedia | EditorTemplate) {
      console.log("upload", props);
      switch (type) {
        case "image":
          this.images.push(props as EditorMedia);
          break;
        case "video":
          this.videos.push(props as EditorMedia);
          break;
        case "audio":
          this.audios.push(props as EditorAudio);
          break;
        case "template": {
          const data = props as EditorTemplate;
          const index = this.templates.findIndex((template) => template.id === data.id);
          if (index === -1) this.templates.push(data);
          else this.templates[index] = data;
          break;
        }
      }
      this.subscribers.forEach((listener) => listener());
    }
  }
});

export const objective: string = "CTX";

export const brand: EditorBrand = {
  brand_name: "Zewar",
  brand_logo: "https://d273i1jagfl543.cloudfront.net/testing/media/business/MI6ykjD-_Sxp6RqpodVvJ.png",
  brand_description: "Zewar | Unique As You. Dime Free Jewellery at Unbeatable Price.",
  primary_colors: ["#FFFDFC", "#050807", "#666666"],
  secondary_colors: [],
};

export const product: EditorProduct = {
  id: 2398,
  business_id: 431,
  name: "Satchel Bag",
  currency: "INR",
  description: "Designed in London,Our Gemma bag means business. This faux leather style has an on-trend croc effect and structured shape.",
  tags: null,
  selling_price: 1000,
  site_url: "https://accessorizelondon.in/products/accessorize-london-womens-faux-leather-burgundy-gemma-croc-handheld-satchel-bag",
  images: [
    {
      id: 2519,
      url: "https://d273i1jagfl543.cloudfront.net/testing/media/product/f4BPonMWP9dV6sw-lLQcu.png",
    },
    {
      id: 4092,
      url: "https://d273i1jagfl543.cloudfront.net/testing/media/product/d94d72e7-47af-49c3-86b2-a9c3c8a8cca2",
    },
    {
      id: 4093,
      url: "https://d273i1jagfl543.cloudfront.net/testing/media/product/7ae5bbeb-9e00-44f1-a9f5-3c5bfa5a6a0b",
    },
  ],
};
