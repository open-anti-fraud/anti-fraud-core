export type Response<T> = Image & {
    objects: T;
};

export type Image = {
    _image: {
        blob: string;
        format: string;
    };
};

export type APIError =
    | {
          detail: [
              {
                  loc: Array<number | string>;
                  msg: string;
                  type: string;
              },
          ];
      }
    | { detail: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Sample<T = any> = Partial<Image> & {
    objects: T[];
};

export type FaceFitterFaceDetection = Detection &
    Angles & {
        keypoints: Keypoints & {
            points: Point[];
            fitter_type: string;
        };
    };

export type Detection = BaseDetectionInfo & {
    confidence: number;
    bbox: Bbox;
};

export type BaseDetectionInfo = {
    id: number;
    class: string;
};

export type Bbox = [number, number, number, number];

export type Angles = {
    pose: {
        yaw: number;
        roll: number;
        pitch: number;
    };
};

export type Keypoints = {
    left_eye_brow_left: KeypointData;
    left_eye_brow_up: KeypointData;
    left_eye_brow_right: KeypointData;
    right_eye_brow_left: KeypointData;
    right_eye_brow_up: KeypointData;
    right_eye_brow_right: KeypointData;
    left_eye_left: KeypointData;
    left_eye: KeypointData;
    left_eye_right: KeypointData;
    right_eye_left: KeypointData;
    right_eye: KeypointData;
    right_eye_right: KeypointData;
    left_ear_bottom: KeypointData;
    nose_left: KeypointData;
    nose: KeypointData;
    nose_right: KeypointData;
    right_ear_bottom: KeypointData;
    mouth_left: KeypointData;
    mouth: KeypointData;
    mouth_right: KeypointData;
    chin: KeypointData;
};

export type KeypointData = {
    proj: number[];
};

export type Point = {
    x: number;
    y: number;
};

export type FaceDetectionTemplateExtractor = Detection & Template;

export type Template = {
    template: {
        [key: string]: {
            blob: string;
            format: string;
            dtype: string;
            shape: number[];
        };
    };
};
