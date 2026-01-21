import { ref } from "vue";
import { defineStore } from "pinia";
import api from "@/utils/api";
import { toast } from 'vue-sonner';

// Cache for curated templates to avoid unnecessary API calls
interface CuratedTemplatesCache {
  data: any | null;
  timestamp: number;
  page: number;
}

const curatedTemplatesCache: CuratedTemplatesCache = {
  data: null,
  timestamp: 0,
  page: 0,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const DEFAULT_LIMIT = 100;

export const usePublicTemplates = defineStore("publicTemplates", (): any => {
  const templates = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const totalResults = ref(0);
  const currentPage = ref(0);
  const hasNextPage = ref(false);
  const hasPrevPage = ref(false);

  const clearCuratedTemplatesCache = () => {
    curatedTemplatesCache.data = null;
    curatedTemplatesCache.timestamp = 0;
    curatedTemplatesCache.page = 0;
  };

  const mapTemplates = (templates: any[]) => {
    return templates.map((template: any) => {
      try {
        if (typeof template.pages === 'string') {
          template.pages = JSON.parse(template.pages);
        }
      } catch (err) {
        console.error("Failed to parse template pages:", err);
        template.pages = [];
      }
      return template;
    });
  };

  const fetchTemplates = async (url: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(url);
      const data = response.data;

      templates.value = mapTemplates(data.templates);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch templates";
      toast.error(error.value || "Failed to fetch templates");
      templates.value = [];
    } finally {
      loading.value = false;
    }
  };

  const searchTemplates = async (query: string, page = 0) => {
    const url = `/media/templates?query=${encodeURIComponent(query)}&page=${page}&per_page=${DEFAULT_LIMIT}&public=true`;
    await fetchTemplates(url);
  };

  const searchTemplatesAppend = async (query: string, page = 0) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/templates?query=${encodeURIComponent(query)}&page=${page}&per_page=${DEFAULT_LIMIT}&public=true`;
      const response = await api.get(url);
      const data = response.data;

      templates.value.push(...mapTemplates(data.templates));
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch templates";
      toast.error(error.value || "Failed to fetch templates");
    } finally {
      loading.value = false;
    }
  };

  const loadCuratedtemplates = async (page = 0) => {
    const now = Date.now();
    const isCacheValid = curatedTemplatesCache.data && curatedTemplatesCache.page === page && now - curatedTemplatesCache.timestamp < CACHE_DURATION;

    if (isCacheValid && curatedTemplatesCache.data) {
      const data = curatedTemplatesCache.data;
      templates.value = mapTemplates(data.templates);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
      error.value = null;
      return;
    }

    const url = `/media/templates?page=${page}&per_page=${DEFAULT_LIMIT}&public=true`;
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(url);
      const data = response.data;

      curatedTemplatesCache.data = data;
      curatedTemplatesCache.timestamp = now;
      curatedTemplatesCache.page = page;

      templates.value = mapTemplates(data.templates);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch templates";
      toast.error(error.value || "Failed to fetch templates");
      templates.value = [];
    } finally {
      loading.value = false;
    }
  };

  const loadCuratedtemplatesAppend = async (page = 0) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/templates?page=${page}&per_page=${DEFAULT_LIMIT}&public=true`;
      const response = await api.get(url);
      const data = response.data;

      templates.value.push(...mapTemplates(data.templates));
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch templates";
      toast.error(error.value || "Failed to fetch templates");
    } finally {
      loading.value = false;
    }
  };

  const clearTemplates = () => {
    templates.value = [];
    error.value = null;
    totalResults.value = 0;
    currentPage.value = 0;
    hasNextPage.value = false;
    hasPrevPage.value = false;
    clearCuratedTemplatesCache();
  };

  const refreshCuratedTemplates = async (page = 0) => {
    clearCuratedTemplatesCache();
    await loadCuratedtemplates(page);
  };

  return {
    templates,
    loading,
    error,
    totalResults,
    currentPage,
    hasNextPage,
    hasPrevPage,
    searchTemplates,
    loadCuratedtemplates,
    searchTemplatesAppend,
    loadCuratedtemplatesAppend,
    clearTemplates,
    refreshCuratedTemplates,
  };
}) as any;
