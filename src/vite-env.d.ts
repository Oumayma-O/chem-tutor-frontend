/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Max answer reveals per lesson (positive integer; default 6). */
  readonly VITE_TUTOR_MAX_ANSWER_REVEALS_PER_LESSON?: string;
  /** Min unique Level 1 worked examples before Level 2 (positive integer; default 2). */
  readonly VITE_TUTOR_MIN_LEVEL1_EXAMPLES_FOR_LEVEL2?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
