import { ref, onMounted, onUnmounted } from 'vue';

export function useMeasure() {
  const elementRef = ref<HTMLElement | null>(null);
  const dimensions = ref({ width: 0, height: 0 });

  const updateDimensions = () => {
    if (elementRef.value) {
      dimensions.value = {
        width: elementRef.value.offsetWidth,
        height: elementRef.value.offsetHeight,
      };
    }
  };

  onMounted(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateDimensions);
  });

  return [elementRef, dimensions];
}
