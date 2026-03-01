import { ref, onMounted, onUnmounted } from 'vue';

function useMediaQuery(query: string) {
  const matches = ref(false);

  let mediaQueryList: MediaQueryList;

  const updateMatch = () => {
    matches.value = mediaQueryList.matches;
  };

  onMounted(() => {
    mediaQueryList = window.matchMedia(query);
    updateMatch();
    mediaQueryList.addEventListener('change', updateMatch);
  });

  onUnmounted(() => {
    if (mediaQueryList) {
      mediaQueryList.removeEventListener('change', updateMatch);
    }
  });

  return matches;
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 768px)");
}

export function useIsTablet() {
  // return useMediaQuery("(min-width: 640px)");
  return ref(true);
}