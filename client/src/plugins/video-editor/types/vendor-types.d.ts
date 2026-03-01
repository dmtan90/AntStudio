export interface PexelsImage {
    id: number;
    width: number;
    height: number;
    url: string;
    photographer: string;
    photographer_url: string;
    photographer_id: number;
    avg_color: string;
    src: {
        original: string;
        large2x: string;
        large: string;
        medium: string;
        small: string;
        portrait: string;
        landscape: string;
    };
    alt: string;
    preview: string;
    details: {
        src: string;
    };
}

export interface PexelsVideo {
    id: number;
    width: number;
    height: number;
    url: string;
    image: string;
    duration: number;
    user: {
        id: number;
        name: string;
        url: string;
    };
    video_files: {
        id: number;
        quality: string;
        file_type: string;
        width: number;
        height: number;
        link: string;
    }[];
    video_pictures: {
        id: number;
        picture: string;
        nr: number;
    }[];
    preview: string;
    details: {
        src: string;
    };
    play?: boolean;
}

export interface UnsplashImage {
    id: string;
    width: number;
    height: number;
    url: string;
    description: string;
    preview: string;
    details: {
        src: string;
    };
}

export interface PexelsResponse {
    page: number;
    per_page: number;
    total_results: number;
    next_page: string | boolean;
    prev_page?: string | boolean;
    photos?: PexelsImage[];
    videos?: PexelsVideo[];
    templates?: any[];
    unsplash_images?: UnsplashImage[];
}
