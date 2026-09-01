import type { AudioProcessorOptions, TrackProcessor } from 'livekit-client';
import { Track } from 'livekit-client';
import {
  acquireVoiceEnhancementAudioContext,
  releaseVoiceEnhancementAudioContext,
} from './audioContext';

export type VoiceEnhancementErrorType =
  | 'voice_enhancement_load_failed'
  | 'voice_enhancement_init_failed'
  | 'voice_enhancement_track_failed'
  | 'voice_enhancement_unsupported';

export class VoiceEnhancementError extends Error {
  public readonly cause?: unknown;

  constructor(
    public readonly type: VoiceEnhancementErrorType,
    cause?: unknown,
  ) {
    super(type);
    this.name = 'VoiceEnhancementError';
    this.cause = cause;
  }
}

type CreateWasmProcessor = (
  audioContext: AudioContext,
  properties: { intensity: number },
) => Promise<AudioNode>;

let processorLoader: Promise<CreateWasmProcessor> | undefined;

export function loadVoiceProcessor(): Promise<CreateWasmProcessor> {
  processorLoader ??= import('@libreaudio/la-call').then((module) => module.createWasmProcessor);
  return processorLoader;
}

type VoiceEnhancementProcessorOptions = {
  intensity: number;
  onError?: (error: VoiceEnhancementError) => void;
};

type AudioGraph = {
  source: MediaStreamAudioSourceNode;
  processor: AudioNode;
  destination: MediaStreamAudioDestinationNode;
  processedTrack: MediaStreamTrack;
};

export class VoiceEnhancementProcessor implements TrackProcessor<
  Track.Kind.Audio,
  AudioProcessorOptions
> {
  readonly name = 'xi-voice-enhancement';
  processedTrack?: MediaStreamTrack;

  private graph?: AudioGraph;
  private audioContext?: AudioContext;
  private acquiredContext = false;
  private generation = 0;
  private destroyed = false;
  private intensity: number;
  private readonly onError?: (error: VoiceEnhancementError) => void;

  constructor({ intensity, onError }: VoiceEnhancementProcessorOptions) {
    this.intensity = intensity;
    this.onError = onError;
  }

  async init(options: AudioProcessorOptions): Promise<void> {
    this.destroyed = false;
    const generation = ++this.generation;

    try {
      this.audioContext = await acquireVoiceEnhancementAudioContext();
      this.acquiredContext = true;
      await this.buildGraph(options.track, generation);
    } catch (error) {
      await this.cleanupAfterFailedInit();
      throw error;
    }
  }

  async restart(options: AudioProcessorOptions): Promise<void> {
    const generation = ++this.generation;
    this.teardownGraph();

    try {
      await this.buildGraph(options.track, generation);
    } catch (error) {
      if (
        this.destroyed ||
        generation !== this.generation ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        return;
      }
      const typedError = toVoiceEnhancementError(error, 'voice_enhancement_init_failed');
      this.processedTrack = options.track;
      this.onError?.(typedError);
    }
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.generation += 1;
    this.teardownGraph();

    if (this.acquiredContext) {
      this.acquiredContext = false;
      await releaseVoiceEnhancementAudioContext().catch(() => undefined);
    }
    this.audioContext = undefined;
  }

  setIntensity(intensity: number): void {
    this.intensity = intensity;
    const processor = this.graph?.processor;
    if (processor && 'port' in processor) {
      (processor as AudioWorkletNode).port.postMessage({
        type: 'param',
        symbol: 'intensity',
        value: intensity,
      });
    }
  }

  private async buildGraph(track: MediaStreamTrack, generation: number): Promise<void> {
    const context = this.audioContext;
    if (!context) {
      throw new VoiceEnhancementError('voice_enhancement_unsupported');
    }

    let source: MediaStreamAudioSourceNode;
    try {
      source = context.createMediaStreamSource(new MediaStream([track]));
    } catch (error) {
      throw new VoiceEnhancementError('voice_enhancement_track_failed', error);
    }

    let createWasmProcessor: CreateWasmProcessor;
    try {
      createWasmProcessor = await loadVoiceProcessor();
    } catch (error) {
      source.disconnect();
      throw new VoiceEnhancementError('voice_enhancement_load_failed', error);
    }

    let processor: AudioNode;
    try {
      processor = await createWasmProcessor(context, { intensity: this.intensity });
    } catch (error) {
      source.disconnect();
      throw new VoiceEnhancementError('voice_enhancement_init_failed', error);
    }

    if (this.destroyed || generation !== this.generation) {
      source.disconnect();
      processor.disconnect();
      throw new DOMException('Voice enhancement initialization was cancelled', 'AbortError');
    }

    let destination: MediaStreamAudioDestinationNode | undefined;
    let processedTrack: MediaStreamTrack | undefined;
    try {
      destination = context.createMediaStreamDestination();
      source.connect(processor).connect(destination);
      processedTrack = destination.stream.getAudioTracks()[0];
    } catch (error) {
      source.disconnect();
      processor.disconnect();
      destination?.disconnect();
      destination?.stream.getTracks().forEach((destinationTrack) => destinationTrack.stop());
      throw new VoiceEnhancementError('voice_enhancement_track_failed', error);
    }
    if (!destination || !processedTrack) {
      source.disconnect();
      processor.disconnect();
      destination.disconnect();
      throw new VoiceEnhancementError('voice_enhancement_track_failed');
    }

    this.graph = { source, processor, destination, processedTrack };
    this.processedTrack = processedTrack;
  }

  private teardownGraph(): void {
    const graph = this.graph;
    this.graph = undefined;
    this.processedTrack = undefined;
    if (!graph) return;

    graph.source.disconnect();
    graph.processor.disconnect();
    graph.destination.disconnect();
    graph.processedTrack.stop();
  }

  private async cleanupAfterFailedInit(): Promise<void> {
    this.teardownGraph();
    if (this.acquiredContext) {
      this.acquiredContext = false;
      await releaseVoiceEnhancementAudioContext().catch(() => undefined);
    }
    this.audioContext = undefined;
  }
}

export function toVoiceEnhancementError(
  error: unknown,
  fallbackType: VoiceEnhancementErrorType,
): VoiceEnhancementError {
  return error instanceof VoiceEnhancementError
    ? error
    : new VoiceEnhancementError(fallbackType, error);
}
