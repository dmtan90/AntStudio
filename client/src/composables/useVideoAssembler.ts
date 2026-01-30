import { ref } from 'vue';
import { useProjectStore } from '@/stores/project';
import { toast } from 'vue-sonner';

export interface ExportOptions {
    format: 'mp4' | 'webm';
    codec: string;
    resolution: '720p' | '1080p' | '4k';
    fps: number;
    bitrate: 'low' | 'medium' | 'high';
    includeAudio: boolean;
}

export function useVideoAssembler() {
    const projectStore = useProjectStore();
    const isAssembling = ref(false);
    const progress = ref(0);
    const status = ref('');
    const error = ref<string | null>(null);
    const result = ref<{ blob: Blob; reviewBlob: Blob; duration: number } | null>(null);

    let worker: Worker | null = null;

    const assemble = async (options: ExportOptions, projectOverride?: any) => {
        const projectData = projectOverride || projectStore.currentProject;

        if (!projectData) {
            toast.error('No active project found');
            return;
        }

        isAssembling.value = true;
        progress.value = 0;
        status.value = 'Initializing...';
        error.value = null;
        result.value = null;

        try {
            // Initialize Worker
            worker = new Worker(new URL('../workers/videoAssembly.worker.ts', import.meta.url), {
                type: 'module'
            });

            worker.onmessage = async (event) => {
                const data = event.data;

                if (data.type === 'progress') {
                    progress.value = data.progress * 100;
                    status.value = data.status || 'Processing...';
                } else if (data.type === 'error') {
                    handleError(data.error);
                } else if (data.type === 'complete') {
                    handleComplete(data, options);
                }
            };

            worker.onerror = (e) => {
                handleError(e.message);
            };

            // Start Assembly
            const token = localStorage.getItem('auth-token');
            worker.postMessage({
                project: projectData, // Pass the override which might contain blobs
                options: JSON.parse(JSON.stringify(options)),
                token
            });

        } catch (e: any) {
            handleError(e.message);
        }
    };

    const handleError = (msg: string) => {
        console.error('[Assembler] Error:', msg);
        error.value = msg;
        isAssembling.value = false;
        toast.error(`Assembly failed: ${msg}`);
        if (worker) {
            worker.terminate();
            worker = null;
        }
    };

    const handleComplete = async (data: any, options: ExportOptions) => {
        status.value = 'Assembly complete! Finalizing project...';
        progress.value = 95;
        result.value = {
            blob: data.blob,
            reviewBlob: data.reviewBlob,
            duration: data.duration
        };

        try {
            const projectId = projectStore.currentProject?._id;
            if (!projectId) throw new Error('Project ID missing');

            // Use FormData for direct multipart upload
            const formData = new FormData();
            formData.append('video', data.blob, `final_video.${options.format || 'mp4'}`);
            if (data.reviewBlob) {
                formData.append('review', data.reviewBlob, `review_clip.${options.format || 'mp4'}`);
            }
            formData.append('duration', data.duration.toString());
            formData.append('resolution', options.resolution);

            // Upload directly to project endpoint via store
            await projectStore.uploadFinalVideo(projectId, formData, (percent) => {
                progress.value = 95 + (percent * 0.05); // Last 5% for upload
                status.value = `Uploading: ${percent}%`;
            });

            status.value = 'All done!';
            progress.value = 100;
            isAssembling.value = false;
            toast.success('Video exported and saved successfully!');

            // Refresh project data
            await projectStore.fetchProject(projectId);

        } catch (e: any) {
            handleError(`Upload failed: ${e.message}`);
        } finally {
            if (worker) {
                worker.terminate();
                worker = null;
            }
        }
    };

    const cancel = () => {
        if (worker) {
            worker.terminate();
            worker = null;
        }
        isAssembling.value = false;
        status.value = 'Cancelled';
    };

    return {
        isAssembling,
        progress,
        status,
        error,
        result,
        assemble,
        cancel
    };
}
