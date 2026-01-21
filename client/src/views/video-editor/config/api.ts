import flovaApi from '@/utils/api';
import { QueryClient } from "@tanstack/vue-query";
import { createInstance } from "video-editor/lib/utils";
const HOST = "http://0.0.0.0";

export const api = flovaApi;

export const queryClient = createInstance(QueryClient, {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,
    },
  },
});

export const searchParams = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const { searchParams } = new URL(url);
    return searchParams;
  }
  else {
    const { searchParams } = new URL(url, HOST);
    return searchParams;
  }
};
