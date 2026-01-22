import { nanoid } from "nanoid";
import { toRaw } from "vue";
import { api } from "video-editor/config/api";
import { useEditorStore } from "video-editor/store/editor";
import { compressImageFile, compressVideoFile, extractAudioWaveformFromAudioFile, extractThumbnailFromImage, extractThumbnailFromVideo } from "video-editor/lib/media";
import { createFormData, createInstance, createPromise } from "video-editor/lib/utils";

export interface UploadAsset {
  name?: string;
  source: string;
  duration?: number;
  thumbnail: string;
}

async function upload(file: File | Blob, name: string, purpose: string = 'media'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);

  const response = await api.post("/media/upload", formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  // Flova API returns { key, url, media } in data
  // We want the proxied URL for the editor
  const key = response.data.data ? response.data.data.key : response.data.key; // Safe check
  return `/api/s3/${key}`;
}

export async function uploadAssetToS3(file: File, type: "image" | "video" | "audio" | "thumbnail"): Promise<UploadAsset> {
  const id = nanoid();
  const thumbname = id + ".png";
  const filename = id + file.name.split(".").pop();
  const editor = useEditorStore();

  switch (type) {
    case "image": {
      const files = await Promise.all([compressImageFile(file), extractThumbnailFromImage(file)]);
      const [source, thumbnail] = await Promise.all([
        upload(files[0], filename, 'image'),
        upload(files[1], thumbname, 'thumbnail')
      ]);
      return { source, thumbnail, name: file.name };
    }

    case "video": {
      const files = await Promise.all([compressVideoFile(toRaw(editor.ffmpeg), file), extractThumbnailFromVideo(file)]);
      const [source, thumbnail] = await Promise.all([
        upload(files[0], filename, 'video'),
        upload(files[1], thumbname, 'thumbnail')
      ]);
      return { source, thumbnail, name: file.name };
    }

    case "audio": {
      const [source, { duration, thumbnail }] = await Promise.all([
        upload(file, filename, 'audio'),
        extractAudioWaveformFromAudioFile(file).then((waveform) => upload(waveform.thumbnail, thumbname, 'thumbnail').then((thumbnail) => ({ thumbnail, duration: waveform.duration }))),
      ]);
      return { source, duration, thumbnail, name: file.name };
    }

    case "thumbnail": {
      const thumbnail = await upload(file, thumbname, 'thumbnail');
      return { source: thumbnail, thumbnail: thumbnail, name: file.name };
    }

    default:
      throw createInstance(Error, "The provided asset type is not valid!");
  }
}

export async function readAssetAsDataURL(file: File) {
  return createPromise<string>((resolve, reject) => {
    const reader = createInstance(FileReader);
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.addEventListener("error", () => reject());
    reader.readAsDataURL(file);
  });
}
