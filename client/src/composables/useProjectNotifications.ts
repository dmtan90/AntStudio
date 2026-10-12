import { useProjectStore } from '@/stores/project';
import { useAppSocket } from '@/utils/appSocket';
import { toast } from 'vue-sonner';

export function useProjectNotifications(projectId: string) {
    const projectStore = useProjectStore();

    const onProjectUpdated = (data: any) => {
        if (data.projectId !== projectId) return;

        if (data.type === 'highlight_captured') {
            toast.success('Viral moment captured!', {
                description: `Gemini just added a new highlight to your project.`,
                action: {
                    label: 'View',
                    onClick: () => {
                        window.dispatchEvent(new CustomEvent('editor:refresh-assets'));
                    }
                }
            });
            projectStore.fetchProject(projectId);
        } else if (data.type === 'montage_ready') {
            toast.success('AI Montage is ready!', {
                description: 'Gemini has finished producing your recap video.',
                action: {
                    label: 'Open',
                    onClick: () => {
                        // Potentially navigate or refresh
                        window.location.reload();
                    }
                }
            });
            projectStore.fetchProject(projectId);
        } else if (data.type === 'segment_video_ready') {
            projectStore.fetchProject(projectId);
        } else if (data.type === 'segment_video_failed') {
            toast.error(`Video generation failed for segment ${data.segmentOrder}`);
        }
    };

    // Shared app connection; the handler is removed automatically on unmount
    const { socket } = useAppSocket({ 'project:updated': onProjectUpdated });

    return {
        socket
    };
}
