import { defaultSpringConfig, EditorAnimation } from 'video-editor/constants/animations'
import { useEditorStore } from 'video-editor/store/editor'
import { FabricUtils } from 'video-editor/fabric/utils'

export function useAnimationControls(selected: fabric.Object, type: 'in' | 'out' | 'scene') {
  const editor = useEditorStore()

  const selectAnimation = (animation: EditorAnimation) => {
    // console.log("selectAnimation", animation);
    editor.canvas.onChangeActiveObjectAnimation(type, animation.value)
    if (animation.value !== 'none') {
      const duration = animation.fixed?.duration ? animation.duration : selected.anim?.[type].duration
      const easing = animation.fixed?.easing ? animation.easing : selected.anim?.[type].easing
      editor.canvas.onChangeActiveObjectAnimationDuration(type, duration || 500)
      editor.canvas.onChangeActiveObjectAnimationEasing(type, easing || 'linear')
      if (FabricUtils.isTextboxElement(selected)) {
        const animate = animation.fixed?.text ? animation.text : selected.anim?.[type].text
        editor.canvas.onChangeActiveTextAnimationType(type, animate)
      }
    }
  }

  const changeDuration = (event: Event) => {
    const value = +(event.target as HTMLInputElement).value * 1000
    if (isNaN(value) || value < 0) return
    editor.canvas.onChangeActiveObjectAnimationDuration(type, value)
  }

  const changeEasing = (easing: string) => {
    editor.canvas.onChangeActiveObjectAnimationEasing(type, easing)
    if (easing === 'spring')
      editor.canvas.onChangeActiveObjectAnimationPhysics(type, selected.anim?.[type]?.config || defaultSpringConfig)
  }

  const changePhysics = (config: any) => {
    editor.canvas.onChangeActiveObjectAnimationPhysics(type, config)
  }

  const changeTextAnimate = (animate: string) => {
    editor.canvas.onChangeActiveTextAnimationType(type, animate as any)
  }

  return {
    selectAnimation,
    changeDuration,
    changeEasing,
    changePhysics,
    changeTextAnimate,
  }
}