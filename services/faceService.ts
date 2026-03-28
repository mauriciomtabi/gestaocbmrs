import * as faceapi from 'face-api.js';

// Models are loaded from jsDelivr CDN to avoid bundling large weight files
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

let modelsLoaded = false;
let modelsLoading = false;

export const loadFaceModels = async (): Promise<void> => {
  if (modelsLoaded) return;
  if (modelsLoading) {
    // Wait for the existing load to complete
    while (modelsLoading) await new Promise(r => setTimeout(r, 100));
    return;
  }

  modelsLoading = true;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
    ]);
    modelsLoaded = true;
    console.log('[FaceService] Modelos carregados com sucesso.');
  } catch (err) {
    modelsLoading = false;
    throw new Error('Falha ao carregar modelos de reconhecimento facial. Verifique sua conexão.');
  } finally {
    modelsLoading = false;
  }
};

/**
 * Detecta um rosto em um elemento de vídeo ou canvas e retorna seu descritor (vetor de 128 floats).
 * Retorna null se nenhum rosto foi detectado.
 */
export const detectFaceDescriptor = async (
  mediaElement: HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> => {
  await loadFaceModels();

  const detection = await faceapi
    .detectSingleFace(mediaElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5, inputSize: 224 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection ? detection.descriptor : null;
};

/**
 * Detecta todos os rostos em um elemento de vídeo (para preview).
 */
export const detectAllFaces = async (
  mediaElement: HTMLVideoElement | HTMLCanvasElement
): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>>[]> => {
  await loadFaceModels();
  return faceapi
    .detectAllFaces(mediaElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5, inputSize: 224 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
};

export interface ProviderDescriptor {
  providerId: string;
  providerName: string;
  providerPhoto?: string;
  descriptor: Float32Array;
}

export interface FaceMatchResult {
  providerId: string;
  providerName: string;
  providerPhoto?: string;
  distance: number; // menor = mais parecido
}

/**
 * Compara um descritor detectado com a lista de descritores cadastrados.
 * Retorna o mais parecido se a distância for menor que o threshold.
 */
export const findBestMatch = (
  inputDescriptor: Float32Array,
  candidates: ProviderDescriptor[],
  threshold = 0.55
): FaceMatchResult | null => {
  if (!candidates.length) return null;

  let bestMatch: FaceMatchResult | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = faceapi.euclideanDistance(inputDescriptor, candidate.descriptor);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = {
        providerId: candidate.providerId,
        providerName: candidate.providerName,
        providerPhoto: candidate.providerPhoto,
        distance,
      };
    }
  }

  return bestMatch && bestDistance <= threshold ? bestMatch : null;
};

/**
 * Converte Float32Array para array de números (para salvar no banco).
 */
export const descriptorToArray = (descriptor: Float32Array): number[] => {
  return Array.from(descriptor);
};

/**
 * Converte array de números de volta para Float32Array.
 */
export const arrayToDescriptor = (arr: number[]): Float32Array => {
  return new Float32Array(arr);
};
