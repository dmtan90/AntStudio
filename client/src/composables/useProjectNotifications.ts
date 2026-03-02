import { onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '@/stores/user';
import { useProjectStore } from '@/stores/project';
import { toast } from 'vue-sonner';

export function useProjectNotifications(projectId: string) {
    let socket: Socket | null = null;
    const userStore = useUserStore();
    const projectStore = useProjectStore();

    const connect = () => {
        if (!userStore.token) return;
        const endpoint = window.location.origin;
        console.log(`[useProjectNotifications] Connecting to ${endpoint} with path /api/socket.io`);
        socket = io(endpoint, {
			//allowEIO3: true, // Enables compatibility with Socket.IO v2 clients
			path: '/socket.io',
            auth: { token: userStore.token },
            transports: ['websocket']
        });

        socket.on('connect', () => {
             console.log('[ProjectNotifications] Connected');
        });

        socket.on('project:updated', (data: any) => {
            if (data.projectId === projectId) {
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
            }
        });

        socket.on('disconnect', () => {
            console.log('[ProjectNotifications] Disconnected');
        });
    };

    onMounted(() => {
        connect();
    });

    onUnmounted(() => {
        if (socket) {
            socket.disconnect();
        }
    });

    return {
        socket
    };
}
