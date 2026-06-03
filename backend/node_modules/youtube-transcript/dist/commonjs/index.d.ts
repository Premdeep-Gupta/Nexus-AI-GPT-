export declare class YoutubeTranscriptError extends Error {
    constructor(message: any);
}
export declare class YoutubeTranscriptTooManyRequestError extends YoutubeTranscriptError {
    constructor();
}
export declare class YoutubeTranscriptVideoUnavailableError extends YoutubeTranscriptError {
    constructor(videoId: string);
}
export declare class YoutubeTranscriptDisabledError extends YoutubeTranscriptError {
    constructor(videoId: string);
}
export declare class YoutubeTranscriptNotAvailableError extends YoutubeTranscriptError {
    constructor(videoId: string);
}
export declare class YoutubeTranscriptNotAvailableLanguageError extends YoutubeTranscriptError {
    constructor(lang: string, availableLangs: string[], videoId: string);
}
export interface TranscriptConfig {
    lang?: string;
    fetch?: typeof globalThis.fetch;
}
export interface TranscriptResponse {
    text: string;
    duration: number;
    offset: number;
    lang?: string;
}
/**
 * Class to retrieve transcript if exist
 */
export declare class YoutubeTranscript {
    /**
     * Fetch transcript from YTB Video
     * @param videoId Video url or video identifier
     * @param config Get transcript in a specific language ISO
     */
    static fetchTranscript(videoId: string, config?: TranscriptConfig): Promise<TranscriptResponse[]>;
    /**
     * Fetch transcript via the InnerTube API (Android client context)
     */
    private static fetchViaInnerTube;
    /**
     * Fetch transcript via web page HTML scraping (fallback)
     */
    private static fetchViaWebPage;
    /**
     * Extract a JSON object assigned to a global variable in inline script tags
     */
    private static parseInlineJson;
    /**
     * Given caption tracks, select the right one, fetch and parse the transcript XML
     */
    private static fetchTranscriptFromTracks;
    /**
     * Parse transcript XML, supporting both srv3 format (<p t="ms">) and
     * classic format (<text start="s" dur="s">)
     */
    private static parseTranscriptXml;
    /**
     * Decode common HTML entities in transcript text
     */
    private static decodeEntities;
    /**
     * Retrieve video id from url or string
     * @param videoId video url or video id
     */
    private static retrieveVideoId;
}
export declare function fetchTranscript(videoId: string, config?: TranscriptConfig): Promise<TranscriptResponse[]>;
