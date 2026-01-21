import { EditorAnimation } from 'video-editor/constants/animations'
import { computed } from 'vue'

const typeToTitleMap: Record<string, string> = {
  textbox: 'Text Animations',
}

export function useAnimationList(object: fabric.Object, list: EditorAnimation[]) {
  const basic = computed(() => {
    return list.filter((animation) => !animation.type)
  })

  const element = computed(() => {
    return list.filter((animation) => animation.type === object.type)
  })

  return computed(() => {
    return [
      { title: 'Basic Animations', list: basic.value },
      element.value.length ? { title: typeToTitleMap[object.type!], list: element.value } : null,
    ].filter(Boolean) as Array<{ title: string; list: EditorAnimation[] }>
  })
}