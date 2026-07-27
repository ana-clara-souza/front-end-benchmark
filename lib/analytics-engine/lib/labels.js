// lib/labels.js
// Equivalente a DATASET_LABELS / MODEL_LABELS em etl.py e etl_prediction.py.
// Mesmos valores nos dois lados do backend original — mantido único aqui
// para não haver drift entre os módulos que dependem dele.

export const DATASET_LABELS = {
  deepweeds: "DeepWeeds",
  weed6c: "Weed6c",
};

export const MODEL_LABELS = {
  mobilenetv3small: "MobileNetV3-Small",
  mobilenetv3large: "MobileNetV3-Large",
  mobilenetv2: "MobileNetV2",
  nasnetmobile: "NASNetMobile",
  efficientnetv2b0: "EfficientNetV2-B0",
  efficientnetv2b1: "EfficientNetV2-B1",
  efficientnetv2b2: "EfficientNetV2-B2",
  efficientnetv2b3: "EfficientNetV2-B3",
  resnet50: "ResNet-50",
  resnet101v2: "ResNet-101V2",
  inceptionv3: "InceptionV3",
};

/** Normaliza um valor de dataset/modelo (snake_case -> label), como df.replace() no pandas. */
export function normalizeLabel(value, table) {
  return Object.prototype.hasOwnProperty.call(table, value) ? table[value] : value;
}
